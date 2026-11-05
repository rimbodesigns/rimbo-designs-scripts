# Builds brand-guide.html from src.html: inlines the three site fonts and the F Brush logo (an Artifact page can't load them from elsewhere).
import base64, re, urllib.request
B='https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/'
F=[('IntegralNEW','68b025db738fc57555d5e08f_Integral-Heavy.woff2'),('Akkuratllsub','6603db04efccc89ef43b319b_AkkuratLLSub-Regular.woff2'),('RM MONO','6ac9363138c51f68d508f25c_rmmono-regular.woff2')]
css=''
for name,f in F:
    d=base64.b64encode(urllib.request.urlopen(urllib.request.Request(B+f,headers={'User-Agent':'build'})).read()).decode()
    css+='@font-face { font-family: "%s"; src: url(data:font/woff2;base64,%s) format("woff2"); font-display: swap; }\n'%(name,d)
svg=open('../../media/logo-f-brush.svg').read()
inner=re.sub(r'<!--.*?-->','',re.search(r'<svg[^>]*>(.*)</svg>',svg,re.S)[1],flags=re.S).replace('fill="white"','fill="currentColor"')
logo='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="logo" viewBox="0 0 72 26">%s</symbol></svg>'%inner
s=open('src.html').read().replace('/* FONTS */',css).replace('<!-- LOGO -->',logo)
open('brand-guide.html','w').write(s); print(len(s)//1024,'KB')
