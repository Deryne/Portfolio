$root = $PSScriptRoot
$l = [System.Net.HttpListener]::new(); $l.Prefixes.Add('http://localhost:8642/'); $l.Start()
$types = @{'.html'='text/html; charset=utf-8';'.css'='text/css';'.js'='text/javascript';'.png'='image/png';'.jpg'='image/jpeg';'.gif'='image/gif';'.webp'='image/webp';'.pdf'='application/pdf'}
while ($l.IsListening) {
  $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if (!$p) { $p = 'index.html' }
  $f = Join-Path $root $p
  if (Test-Path $f -PathType Leaf) { $b = [IO.File]::ReadAllBytes($f); $c.Response.ContentType = $types[[IO.Path]::GetExtension($f)]; $c.Response.OutputStream.Write($b,0,$b.Length) } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
