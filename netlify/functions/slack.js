const https = require('https');
 
const NOTION_TOKEN = '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';
const NOTION_DB = '0ca23dee4a0e4425be8144d5c6158d3b';
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/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';
 
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
 
exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
 
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
 
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }
 
  const { action, payload } = JSON.parse(event.body);
 
  // Write rep entry to Notion + post to Slack
  if (action === 'log') {
    const { name, pushups, situps, squats, burpees, km, slackMessage } = payload;
 
    // Write to Notion
    const notionBody = JSON.stringify({
      parent: { database_id: NOTION_DB },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Pushups: { number: pushups || 0 },
        Situps: { number: situps || 0 },
        Squats: { number: squats || 0 },
        Burpees: { number: burpees || 0 },
        KM: { number: km || 0 }
      }
    });
    await httpsRequest({
      hostname: 'api.notion.com',
      path: '/v1/pages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        'Content-Length': Buffer.byteLength(notionBody)
      }
    }, notionBody);
 
    // Post to Slack
    const slackBody = JSON.stringify({ text: slackMessage });
    const slackUrl = new URL(SLACK_WEBHOOK);
    await httpsRequest({
      hostname: slackUrl.hostname,
      path: slackUrl.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(slackBody) }
    }, slackBody);
 
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }
 
  // Read all entries from Notion and return leaderboard totals
  if (action === 'leaderboard') {
    const body = JSON.stringify({ page_size: 100 });
    const res = await httpsRequest({
      hostname: 'api.notion.com',
      path: `/v1/databases/${NOTION_DB}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        'Content-Length': Buffer.byteLength(body)
      }
    }, body);
 
    const data = JSON.parse(res.body);
    const totals = {};
    for (const page of data.results || []) {
      const p = page.properties;
      const name = p.Name?.title?.[0]?.text?.content || 'Unknown';
      if (!totals[name]) totals[name] = { pushups: 0, situps: 0, squats: 0, burpees: 0, km: 0 };
      totals[name].pushups += p.Pushups?.number || 0;
      totals[name].situps  += p.Situps?.number  || 0;
      totals[name].squats  += p.Squats?.number  || 0;
      totals[name].burpees += p.Burpees?.number || 0;
      totals[name].km      += p.KM?.number      || 0;
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, totals }) };
  }
 
  return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Unknown action' }) };
};
