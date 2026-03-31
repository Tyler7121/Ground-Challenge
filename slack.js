exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { webhookUrl, text } = JSON.parse(event.body);

  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { statusCode: 400, body: 'Invalid webhook URL' };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  return {
    statusCode: response.ok ? 200 : 500,
    body: response.ok ? 'ok' : 'failed'
  };
};
