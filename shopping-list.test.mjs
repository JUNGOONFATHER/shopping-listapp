/**
 * 쇼핑 리스트 앱 자동 테스트
 * 실행: node shopping-list.test.mjs
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8787/shopping-list.html';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await clearStorage(page);

  console.log('\n[테스트 1] 초기 화면 상태');

  const emptyMsg = await page.locator('#empty').isVisible();
  assert(emptyMsg, '초기 상태에서 "아이템을 추가해 보세요!" 메시지가 보임');

  const listCount = await page.locator('#list li').count();
  assert(listCount === 0, '초기 리스트가 비어있음 (0개)');

  const statsText = await page.locator('#stats').innerText();
  assert(statsText === '', '초기 통계 텍스트가 비어있음');

  console.log('\n[테스트 2] 아이템 추가 - 버튼 클릭');

  await page.fill('#itemInput', '우유');
  await page.click('button:has-text("추가")');

  let items = await page.locator('#list li').count();
  assert(items === 1, '우유 추가 후 리스트에 1개');

  const firstItemText = await page.locator('#list li .item-text').first().innerText();
  assert(firstItemText === '우유', '첫 번째 아이템 텍스트가 "우유"');

  assert(!(await page.locator('#empty').isVisible()), '아이템 추가 후 빈 메시지 숨겨짐');

  console.log('\n[테스트 3] 아이템 추가 - Enter 키');

  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  items = await page.locator('#list li').count();
  assert(items === 2, 'Enter 키로 계란 추가 후 리스트에 2개');

  await page.fill('#itemInput', '식빵');
  await page.press('#itemInput', 'Enter');

  items = await page.locator('#list li').count();
  assert(items === 3, '식빵 추가 후 리스트에 3개');

  console.log('\n[테스트 4] 공백 입력 무시');

  await page.fill('#itemInput', '   ');
  await page.click('button:has-text("추가")');
  items = await page.locator('#list li').count();
  assert(items === 3, '공백 입력 시 아이템이 추가되지 않음 (여전히 3개)');

  console.log('\n[테스트 5] 체크 기능');

  const firstCheckbox = page.locator('#list li input[type="checkbox"]').first();
  await firstCheckbox.check();

  const isChecked = await firstCheckbox.isChecked();
  assert(isChecked, '우유 체크박스가 체크됨');

  const firstLiClass = await page.locator('#list li').first().getAttribute('class');
  assert(firstLiClass?.includes('checked'), '체크된 항목에 "checked" 클래스 추가됨');

  const strikethrough = await page.locator('#list li').first().locator('.item-text').evaluate(
    el => getComputedStyle(el).textDecoration
  );
  assert(strikethrough.includes('line-through'), '체크된 아이템에 취소선 적용됨');

  const statsAfterCheck = await page.locator('#stats').innerText();
  assert(statsAfterCheck === '1 / 3 완료', `통계가 "1 / 3 완료"로 표시됨 (실제: "${statsAfterCheck}")`);

  const secondCheckbox = page.locator('#list li input[type="checkbox"]').nth(1);
  await secondCheckbox.check();

  const statsAfterCheck2 = await page.locator('#stats').innerText();
  assert(statsAfterCheck2 === '2 / 3 완료', `통계가 "2 / 3 완료"로 표시됨 (실제: "${statsAfterCheck2}")`);

  console.log('\n[테스트 6] 체크 해제');

  await firstCheckbox.uncheck();
  const isUnchecked = !(await firstCheckbox.isChecked());
  assert(isUnchecked, '우유 체크박스 해제됨');

  const statsAfterUncheck = await page.locator('#stats').innerText();
  assert(statsAfterUncheck === '1 / 3 완료', `체크 해제 후 통계 "1 / 3 완료" (실제: "${statsAfterUncheck}")`);

  console.log('\n[테스트 7] 개별 아이템 삭제');

  await page.locator('#list li .delete-btn').first().click();

  items = await page.locator('#list li').count();
  assert(items === 2, '우유 삭제 후 리스트에 2개 남음');

  const remainingTexts = await page.locator('#list li .item-text').allInnerTexts();
  assert(!remainingTexts.includes('우유'), '삭제된 "우유"가 리스트에 없음');
  assert(remainingTexts.includes('계란'), '"계란"은 여전히 존재');
  assert(remainingTexts.includes('식빵'), '"식빵"은 여전히 존재');

  console.log('\n[테스트 8] 완료 항목 일괄 삭제');

  await page.locator('#list li input[type="checkbox"]').nth(1).check();
  await page.click('button.clear-btn');

  items = await page.locator('#list li').count();
  assert(items === 0, '완료 항목 일괄 삭제 후 리스트가 비어있음 (0개)');

  const emptyAfterClear = await page.locator('#empty').isVisible();
  assert(emptyAfterClear, '일괄 삭제 후 빈 메시지 다시 표시됨');

  console.log('\n[테스트 9] 로컬 스토리지 저장');

  await page.fill('#itemInput', '사과');
  await page.press('#itemInput', 'Enter');
  await page.fill('#itemInput', '오렌지');
  await page.press('#itemInput', 'Enter');

  await page.locator('#list li input[type="checkbox"]').nth(1).check();
  await page.reload();

  items = await page.locator('#list li').count();
  assert(items === 2, '새로고침 후 아이템 2개가 유지됨 (로컬 스토리지 저장 확인)');

  const savedTexts = await page.locator('#list li .item-text').allInnerTexts();
  assert(savedTexts.includes('사과'), '새로고침 후 "사과" 유지됨');
  assert(savedTexts.includes('오렌지'), '새로고침 후 "오렌지" 유지됨');

  const orangeChecked = await page.locator('#list li input[type="checkbox"]').nth(1).isChecked();
  assert(orangeChecked, '새로고침 후 "오렌지" 체크 상태 유지됨');

  const total = passed + failed;
  console.log('\n' + '='.repeat(45));
  console.log(`테스트 결과: ${passed}/${total} 통과`);
  if (failed > 0) {
    console.error(`실패: ${failed}개`);
    process.exitCode = 1;
  } else {
    console.log('모든 테스트 통과!');
  }
  console.log('='.repeat(45) + '\n');

  await browser.close();
})();
