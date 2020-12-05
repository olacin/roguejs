import puppeteer from 'puppeteer-core'
import twilio from 'twilio'

const email = process.env.EMAIL || ''
const password = process.env.PASSWORD || ''
const phoneNumber = process.env.PHONE || ''
const accountSid = process.env.TWILIO_SID || ''
const authToken = process.env.TWILIO_TOKEN || ''
const webhookUrl = process.env.WEBHOOK_URL || ''

const client = twilio(accountSid, authToken)

interface IProduct {
  weight: number
  ref: string
  quantity: number
  available?: boolean
}

let wishlist: IProduct[] = [
  {
    weight: 10,
    ref: '#grouped-product-item-40469',
    quantity: 1,
  },
  {
    weight: 25,
    ref: '#grouped-product-item-40475',
    quantity: 3,
  },
]

async function sendSMS() {
  try {
    await client.messages
      .create({
        body: '[ALERT] Rogue restocked calibrated plates -- https://bit.ly/3gapmI4',
        from: '*redacted*',
        to: phoneNumber,
      })
      .then(() => console.log('[ALERT] Successfully alerted via SMS'))
  } catch (err) {
    console.error(err)
  }
}

async function sendTelegram(browser: puppeteer.Browser) {
  try {
    const page = await browser.newPage()
    await page
      .goto(webhookUrl, { waitUntil: 'networkidle0' })
      .then(() => console.log('[ALERT] Successfully alerted via Telegram'))
  } catch (err) {
    console.error(err)
  }
}

async function updateAvailability(page: puppeteer.Page, products: IProduct[]): Promise<IProduct[]> {
  return Promise.all(
    products.map(async (p) => {
      return {
        ...p,
        available: (await page.$(p.ref)) !== null,
      }
    })
  )
}

async function login(page: puppeteer.Page) {
  await page.goto('https://www.rogueeurope.eu/customer/account/login', { waitUntil: 'networkidle0' })
  // Fill credentials
  await page.$eval('#email', (emailInput, emailValue) => emailInput.setAttribute('value', emailValue), email)
  await page.$eval(
    '#pass',
    (passwordInput, passwordValue) => passwordInput.setAttribute('value', passwordValue),
    password
  )
  // Submit login
  return Promise.all([page.click('button.btn-login'), page.waitForNavigation({ waitUntil: 'networkidle0' })])
}

async function addToCart(page: puppeteer.Page, availableProducts: IProduct[]) {
  await page.goto('https://www.rogueeurope.eu/rogue-calibrated-kg-steel-plates-eu', { waitUntil: 'networkidle0' })
  // Set appropriate quantity to each calibrated plate pair
  await Promise.all(
    availableProducts.map((p) => page.$eval(p.ref, (el, p) => el.setAttribute('value', `${p.quantity}`), p))
  )
  // Add them to cart
  return Promise.all([
    page.click('.options-container-big button'),
    page.waitForSelector('#side-cart', { visible: true }),
  ])
}

;(async () => {
  // Initialize puppeteer
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--proxy-server=http://proxy:8118'],
  })
  try {
    const page = await browser.newPage()
    // eslint-disable-next-line
    while (true) {
      // Fetch calibrated plates page
      await page.goto('https://www.rogueeurope.eu/rogue-calibrated-kg-steel-plates-eu', { waitUntil: 'networkidle0' })
      // Check wishlist availability
      wishlist = await updateAvailability(page, wishlist)
      const available = wishlist.filter((p) => p.available)
      // If any of wishlist product is available, send an alert and add products to cart
      if (available.length > 0) {
        await sendSMS()
        await sendTelegram(browser)
        await login(page)
        await addToCart(page, available)
      } else {
        console.log('[INFO] No stock available')
      }
      await page.waitForTimeout(60000)
    }
  } catch (err) {
    console.error(err)
    // Close the browser engine
    await browser.close()
  }
})()
