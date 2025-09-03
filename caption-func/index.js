// Dependencies: axios (we'll add that in package.json)
const axios = require('axios');

module.exports = async function (context, req) {
  context.log('Caption function called');

  const endpoint = process.env['CV_ENDPOINT']; // paste endpoint here in Function App settings
  const key = process.env['CV_KEY'];           // paste key here in Function App settings

  if (!endpoint || !key) {
    context.res = { status: 500, body: 'Missing CV_ENDPOINT or CV_KEY in app settings' };
    return;
  }

  // incoming body: { imageBase64: "...", imageUrl: "..." }  (we accept either)
  const { imageBase64, imageUrl } = req.body || {};

  // Use the Describe (v3.2) endpoint which returns captions. See docs.
  const url = endpoint.replace(/\/+$/, '') + '/vision/v3.2/describe?maxCandidates=1&language=en';

  let headers = { 'Ocp-Apim-Subscription-Key': key };
  let data;
  if (imageUrl) {
    headers['Content-Type'] = 'application/json';
    data = { url: imageUrl };
  } else if (imageBase64) {
    // remove data uri prefix if present
    const b64 = imageBase64.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(b64, 'base64');
    headers['Content-Type'] = 'application/octet-stream';
    data = buffer;
  } else {
    context.res = { status: 400, body: 'Send { imageBase64 } or { imageUrl } in JSON body' };
    return;
  }

  try {
    const resp = await axios({
      method: 'post',
      url,
      headers,
      data,
      responseType: 'json',
      // for binary data, axios will send buffer correctly
    });

    const json = resp.data || {};
    // best caption text (if present)
    const caption = json.description?.captions?.[0]?.text || null;

    context.res = {
      status: 200,
      body: { caption, raw: json }
    };
  } catch (err) {
    context.log.error('Vision API error', err?.response?.data || err.message);
    context.res = { status: 500, body: { error: 'Vision API call failed', details: err?.response?.data || err.message } };
  }
};
