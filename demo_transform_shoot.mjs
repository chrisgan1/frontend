import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';

mkdirSync('/home/user/frontend/screenshots', { recursive: true });

const BASE = 'http://localhost:5173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Determine the role a page has by checking DOM
async function detectRole(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    // RoleReveal card text
    if (text.includes('YOU ARE A PROP')) return 'prop';
    if (text.includes('YOU ARE A HUNTER')) return 'hunter';
    // HUD: props have move-token circles (gold colored), hunters have crosshair
    // Check for TAUNT/RUSH/HIDE buttons (only props during hunting)
    if (document.querySelector('button') &&
        [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'TAUNT')) return 'prop';
    // Check for "move tokens" or "NO DISGUISE" text
    if (text.includes('NO DISGUISE') || text.includes('move tokens') || text.includes('HIDE NOW')) return 'prop';
    if (text.includes('props alive') || text.includes('WAITING') || text.includes('Props are hiding')) return 'hunter';
    return null;
  });
}

// Get room code from page
async function getRoomCode(page) {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (/^[A-Z0-9]{4,6}$/.test(t)) return t;
    }
    return null;
  });
}

// Wait for specific text to appear
async function waitForText(page, text, timeout = 45000) {
  await page.waitForFunction(
    t => document.body.innerText.includes(t),
    text,
    { timeout }
  );
}

// Force-shoot via socket by injecting into window
async function injectShootTrigger(page) {
  return page.evaluate(() => {
    // Mark that a shoot should happen next frame via a global flag
    window.__pendingShoot = true;
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-web-security', '--use-gl=swiftshader'],
    headless: true,
  });

  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  // ── 1. Create room ─────────────────────────────────────────────────────────
  console.log('[1] Creating room...');
  await page1.goto(BASE);
  await page1.waitForSelector('input');
  await page1.locator('input').first().fill('PropPlayer');
  await page1.locator('button:has-text("CREATE")').click();
  await sleep(2000);

  const roomCode = await getRoomCode(page1);
  console.log('  Room code:', roomCode);
  await page1.screenshot({ path: '/home/user/frontend/screenshots/01_lobby_created.png' });

  // ── 2. Second player joins ─────────────────────────────────────────────────
  console.log('[2] Hunter joining room...');
  await page2.goto(BASE);
  await page2.waitForSelector('input');
  await page2.locator('input').first().fill('HunterAce');
  // Find the room-code input (second field or labeled)
  const inputs2 = await page2.locator('input').all();
  if (inputs2.length >= 2) {
    await inputs2[1].fill(roomCode);
  }
  await page2.locator('button:has-text("JOIN")').click();
  await sleep(2000);
  await Promise.all([
    page1.screenshot({ path: '/home/user/frontend/screenshots/02_lobby_two_players.png' }),
    page2.screenshot({ path: '/home/user/frontend/screenshots/02b_lobby_joiner.png' }),
  ]);

  // ── 3. Start game ──────────────────────────────────────────────────────────
  console.log('[3] Starting game...');
  await page1.locator('button:has-text("Start")').click();
  await sleep(2000);

  // Take role reveal screenshots
  await Promise.all([
    page1.screenshot({ path: '/home/user/frontend/screenshots/03_role_reveal_p1.png' }),
    page2.screenshot({ path: '/home/user/frontend/screenshots/03_role_reveal_p2.png' }),
  ]);
  console.log('  Saved role reveal shots');

  // Detect who is prop and who is hunter
  const role1 = await detectRole(page1);
  const role2 = await detectRole(page2);
  console.log('  P1 role:', role1, '  P2 role:', role2);

  const propPage = role1 === 'prop' ? page1 : page2;
  const hunterPage = role1 === 'hunter' ? page1 : page2;
  console.log('  Prop page:', propPage === page1 ? 'P1(PropPlayer)' : 'P2(HunterAce)');

  // Wait 5s for role reveal to finish
  await sleep(5000);

  // ── 4. Hiding phase — prop opens disguise menu ─────────────────────────────
  console.log('[4] Hiding phase — first disguise...');
  await Promise.all([
    propPage.screenshot({ path: '/home/user/frontend/screenshots/04_hiding_prop_no_disguise.png' }),
    hunterPage.screenshot({ path: '/home/user/frontend/screenshots/04_hiding_hunter_waiting.png' }),
  ]);

  // Open disguise menu with Tab
  await propPage.keyboard.press('Tab');
  await sleep(800);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/05_disguise_menu_open.png' });

  // Pick "Red Barrel" (second item usually)
  const barrel = await propPage.locator('button:has-text("Red Barrel")').first();
  const barrelVisible = await barrel.isVisible().catch(() => false);
  if (barrelVisible) {
    await barrel.click();
    console.log('  Picked: Red Barrel');
  } else {
    const btns = await propPage.locator('.grid button').all();
    if (btns.length > 1) { await btns[1].click(); }
  }
  await sleep(1000);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/06_prop_as_red_barrel.png' });
  await hunterPage.screenshot({ path: '/home/user/frontend/screenshots/06_hunter_sees_barrel.png' });

  // Move prop (WASD — no pointer lock needed for keyboard)
  console.log('[4b] Moving prop...');
  await propPage.keyboard.down('w');
  await sleep(600);
  await propPage.keyboard.up('w');
  await propPage.keyboard.down('a');
  await sleep(400);
  await propPage.keyboard.up('a');
  await sleep(500);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/07_prop_moved_as_barrel.png' });

  // ── 5. Transform to a SECOND disguise ─────────────────────────────────────
  console.log('[5] Transforming to second disguise...');
  await propPage.keyboard.press('Tab');
  await sleep(800);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/08_disguise_menu_second.png' });

  // Pick "Wooden Crate"
  const crate = await propPage.locator('button:has-text("Wooden Crate")').first();
  const crateVisible = await crate.isVisible().catch(() => false);
  if (crateVisible) {
    await crate.click();
    console.log('  Picked: Wooden Crate');
  } else {
    const btns = await propPage.locator('.grid button').all();
    if (btns.length > 0) { await btns[0].click(); }
  }
  await sleep(1000);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/09_prop_as_crate.png' });
  await hunterPage.screenshot({ path: '/home/user/frontend/screenshots/09_hunter_sees_crate.png' });

  // ── 6. Transform to a THIRD disguise ──────────────────────────────────────
  console.log('[6] Transforming to third disguise...');
  await propPage.keyboard.press('Tab');
  await sleep(800);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/10_disguise_menu_third.png' });

  // Pick "Bookshelf" or "Locker" (tall objects)
  const bookshelf = await propPage.locator('button:has-text("Bookshelf")').first();
  const locker = await propPage.locator('button:has-text("Locker")').first();
  const tv = await propPage.locator('button:has-text("TV Stand")').first();
  let thirdPicked = bookshelf;
  if (!(await bookshelf.isVisible().catch(() => false))) thirdPicked = locker;
  if (!(await locker.isVisible().catch(() => false))) thirdPicked = tv;
  const thirdLabel = await thirdPicked.textContent().catch(() => 'unknown');
  await thirdPicked.click().catch(async () => {
    const btns = await propPage.locator('.grid button').all();
    if (btns.length > 3) await btns[3].click();
  });
  console.log('  Picked:', thirdLabel);
  await sleep(1000);
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/11_prop_as_bookshelf.png' });
  await hunterPage.screenshot({ path: '/home/user/frontend/screenshots/11_hunter_sees_bookshelf.png' });

  // ── 7. Wait for hunting phase ──────────────────────────────────────────────
  console.log('[7] Waiting for hunting phase (up to 35s)...');
  let huntingActive = false;
  for (let i = 0; i < 35; i++) {
    await sleep(1000);
    const text = await propPage.evaluate(() => document.body.innerText);
    if (!text.includes('HIDE NOW') && !text.includes('hiding')) {
      huntingActive = true;
      console.log('  Hunting phase detected at', i, 's');
      break;
    }
    if (i % 5 === 0) console.log('  Still waiting...', i, 's');
  }

  await sleep(1500);
  await Promise.all([
    propPage.screenshot({ path: '/home/user/frontend/screenshots/12_hunting_phase_prop.png' }),
    hunterPage.screenshot({ path: '/home/user/frontend/screenshots/12_hunting_phase_hunter.png' }),
  ]);

  // ── 8. Hunter shoots ───────────────────────────────────────────────────────
  console.log('[8] Hunter shoots...');
  // The hunt phase allows clicking. Use force:true to bypass the overlay.
  // First click to "request" pointer lock - use dispatchEvent to bypass overlay
  await hunterPage.evaluate(() => {
    document.querySelector('.w-full.h-full')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await sleep(1000);

  // Simulate actual game shoot via socket API — inject via eval
  const shotResult = await hunterPage.evaluate(() => {
    // Try to find socket.io client and emit
    try {
      // Find the socket from the window-attached io client
      const io = window.io;
      if (io && io.sockets) {
        const s = Object.values(io.sockets)[0];
        if (s) { s.emit('player-shoot', { targetPropId: null }); return 'socket.io sockets found'; }
      }
    } catch(e) {}

    // Try clicking through the overlay
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 640, clientY: 360 }));
      return 'dispatched click on canvas';
    }
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 640, clientY: 360 }));
    return 'dispatched click on document';
  });
  console.log('  Shot result:', shotResult);
  await sleep(800);
  await hunterPage.screenshot({ path: '/home/user/frontend/screenshots/13_hunter_after_shoot.png' });
  await propPage.screenshot({ path: '/home/user/frontend/screenshots/13_prop_after_shot.png' });

  // Wait a bit more and try clicking again
  await hunterPage.evaluate(() => {
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 640, clientY: 360 }));
  });
  await sleep(500);
  await hunterPage.screenshot({ path: '/home/user/frontend/screenshots/14_hunter_second_shot.png' });

  // ── 9. Round end ───────────────────────────────────────────────────────────
  console.log('[9] Waiting for round end...');
  await sleep(5000);
  await Promise.all([
    propPage.screenshot({ path: '/home/user/frontend/screenshots/15_round_end_prop.png' }),
    hunterPage.screenshot({ path: '/home/user/frontend/screenshots/15_round_end_hunter.png' }),
  ]);

  await browser.close();
  console.log('\nAll screenshots saved!');
  const { readdirSync } = await import('fs');
  readdirSync('/home/user/frontend/screenshots').sort().forEach(f => console.log(' ', f));
})().catch(e => { console.error(e); process.exit(1); });
