const https = require('https');
 
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
 
  const { webhookUrl, text } = JSON.parse(event.body);
 
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { statusCode: 400, body: 'Invalid webhook URL' };
  }
 
  const payload = JSON.stringify({ text });
  const url = new URL(webhookUrl);
 
  return new Promise((resolve) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      resolve({ statusCode: res.statusCode === 200 ? 200 : 500, body: res.statusCode === 200 ? 'ok' : 'failed' });
    });
    req.on('error', () => resolve({ statusCode: 500, body: 'error' }));
    req.write(payload);
    req.end();
  });
};
 
