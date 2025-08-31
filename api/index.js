export default async function (context, req) {
  const endpoint = process.env.VISION_ENDPOINT;
  const key = process.env.VISION_KEY;

  if (!endpoint || !key) {
    return { status: 500, body: { error: "Missing VISION_ENDPOINT or VISION_KEY" } };
  }

  const features = ["Caption", "DenseCaptions", "Tags"];
  const apiUrl = `${endpoint}/computervision/imageanalysis:analyze?api-version=2023-10-01&features=${features.join(',')}`;

  try {
    let headers = { "Ocp-Apim-Subscription-Key": key };
    let body; let contentType;

    if (req?.headers["content-type"]?.includes("application/octet-stream")) {
      body = req.body;
      contentType = "application/octet-stream";
    } else {
      const { url } = req.body || {};
      if (!url) return { status: 400, body: { error: "Provide image URL or bytes" } };
      body = JSON.stringify({ url });
      contentType = "application/json";
    }
    headers["Content-Type"] = contentType;

    const resp = await fetch(apiUrl, { method: "POST", headers, body });
    const json = await resp.json();
    if (!resp.ok) return { status: resp.status, body: json };

    const caption = json?.captionResult?.text || json?.captionResult?.captions?.[0]?.text;
    const tags = (json?.tagsResult?.values || []).map(t => t.name);
    const denseCaptions = (json?.denseCaptionsResult?.values || []).map(dc => ({ text: dc.text }));

    return { headers: { "Content-Type": "application/json" }, body: { caption, tags, denseCaptions } };
  } catch (err) {
    return { status: 500, body: { error: String(err) } };
  }
}
