// Gerçek cihaz boyutlarında yatay taşma ve okunabilirlik testi
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173'
const OUT = process.argv[2] || '/tmp/shots'
const CODE = process.argv[3] || 'edauni'

// En dar yaygın cihazdan tablete kadar
const DEVICES = [
  { name: 'iPhone SE',      width: 320, height: 568, dpr: 2 },
  { name: 'iPhone 12 mini', width: 360, height: 780, dpr: 3 },
  { name: 'iPhone 14',      width: 390, height: 844, dpr: 3 },
  { name: 'iPhone 14 ProMax', width: 430, height: 932, dpr: 3 },
  { name: 'iPad mini',      width: 768, height: 1024, dpr: 2 },
]

const UNI_ID = process.argv[4] || ''
const ROLE = process.env.ROLE || 'eda'

const PAGES = ROLE === 'family'
  ? [
      { path: '/', label: 'aile-anasayfa' },
      { path: '/oneri-birak', label: 'aile-oneri' },
    ]
  : [
      { path: '/', label: 'anasayfa' },
      { path: '/universiteler', label: 'universiteler' },
      ...(UNI_ID ? [{ path: `/universiteler/${UNI_ID}`, label: 'uni-detay' }] : []),
      { path: '/takvim', label: 'takvim' },
      { path: '/oneriler', label: 'oneriler' },
    ]

fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
})

const results = []

for (const dev of DEVICES) {
  // Her cihaz temiz bir oturumla baslasin; yoksa oncekinin girisi devrediyor
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({
    width: dev.width, height: dev.height,
    deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  })

  // Giriş
  await page.goto(BASE, { waitUntil: 'networkidle2' })
  try {
    await page.waitForSelector('input[type=password]', { timeout: 20000 })
  } catch (e) {
    const body = await page.evaluate(() => document.body.innerText).catch(() => '(okunamadi)')
    console.log(`\n!!! ${dev.name}: giris kutusu bulunamadi. Sayfadaki metin:\n${body.slice(0, 400)}\n`)
    await page.screenshot({ path: `${OUT}/HATA-${dev.width}.png` })
    await page.close()
    await ctx.close()
    continue
  }

  // Giriş ekranının kendisini de ölç
  const loginOverflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  results.push({
    device: dev.name, page: 'giris',
    overflow: loginOverflow.scrollW - loginOverflow.clientW,
  })
  await page.screenshot({ path: `${OUT}/${dev.width}-giris.png` })

  await page.type('input[type=password]', CODE)
  await page.keyboard.press('Enter')

  // "Profil bulunamadı" bir an bile görünüyor mu?
  let flashed = false
  const watcher = setInterval(async () => {
    try {
      const t = await page.evaluate(() => document.body.innerText)
      if (t.includes('Profil bulunamadı')) flashed = true
    } catch { /* sayfa gecis halinde */ }
  }, 20)

  await page.waitForFunction(
    () => !document.body.innerText.includes('Kodun'),
    { timeout: 20000 },
  ).catch(() => {})
  await new Promise((r) => setTimeout(r, 1500))
  clearInterval(watcher)
  results.push({ device: dev.name, page: 'profil-flasi', flashed })

  for (const p of PAGES) {
    await page.goto(BASE + p.path, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 700))

    const m = await page.evaluate(() => {
      const de = document.documentElement
      // Görünen alandan taşan öğeleri bul
      const guilty = []
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0) continue
        if (r.right > de.clientWidth + 1 || r.left < -1) {
          guilty.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className?.toString?.() || '').slice(0, 60),
            right: Math.round(r.right), left: Math.round(r.left),
          })
        }
      }
      // Çok küçük yazı var mı?
      let tiny = 0
      for (const el of document.querySelectorAll('p,span,div,button,a,label,td,li')) {
        if (!el.textContent?.trim()) continue
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs && fs < 11) tiny++
      }
      return {
        scrollW: de.scrollWidth, clientW: de.clientWidth,
        guilty: guilty.slice(0, 6), tiny,
      }
    })

    results.push({
      device: dev.name, page: p.label,
      overflow: m.scrollW - m.clientW,
      guilty: m.guilty, tiny: m.tiny,
    })
    await page.screenshot({ path: `${OUT}/${dev.width}-${p.label}.png`, fullPage: true })
  }

  await page.close()
  await ctx.close()
}

await browser.close()

// Rapor
let bad = 0
for (const r of results) {
  if (r.page === 'profil-flasi') {
    console.log(`${r.device.padEnd(18)} profil flasi   : ${r.flashed ? '!!! GORUNDU' : 'yok'}`)
    if (r.flashed) bad++
    continue
  }
  const ok = r.overflow <= 0
  if (!ok) bad++
  console.log(
    `${r.device.padEnd(18)} ${r.page.padEnd(14)} : ` +
    `${ok ? 'tamam' : `!!! ${r.overflow}px TASMA`}` +
    (r.tiny ? `  (kucuk yazi: ${r.tiny})` : '')
  )
  if (!ok && r.guilty?.length) {
    for (const g of r.guilty) console.log(`      -> ${g.tag}.${g.cls} right=${g.right}`)
  }
}
console.log(bad === 0 ? '\nHEPSI TEMIZ' : `\n${bad} SORUN VAR`)
