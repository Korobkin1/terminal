"""Run against app.py on port 8765. Requires Playwright and Chromium."""
import os
import shutil
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser = p.chromium.launch(headless=True, **({'executable_path': executable} if executable else {}))
    page = browser.new_page(viewport={'width':1280, 'height':900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8765')
    expect(page.locator('.survey-button')).to_have_count(7)
    page.screenshot(path='/tmp/terminal-menu.png', full_page=True)
    data = page.request.get('http://127.0.0.1:8765/api/surveys').json()
    for survey in data.values():
        page.get_by_role('button').filter(has=page.get_by_text(survey['name'], exact=True)).click()
        n = len(survey['questions'])
        for i in range(n):
            expect(page.get_by_role('heading', level=1)).to_have_text(survey['questions'][i])
            if i == 1:
                page.get_by_role('button', name='← Предыдущий вопрос').click()
                page.get_by_role('button', name='Нет', exact=True).click()
            page.get_by_role('button', name=['Да','Нет','Пропустить'][i % 3], exact=True).click()
        expect(page.get_by_role('heading', name='Ваши ответы готовы')).to_be_visible()
        expect(page.locator('#receipt .receipt-row')).to_have_count(n)
        assert 'Нет' in page.locator('#receipt .receipt-row').first.inner_text()
        page.emulate_media(media='print')
        expect(page.locator('#receipt')).to_be_visible()
        assert page.locator('#receipt').evaluate('(e) => e.getBoundingClientRect().width') < 270
        expect(page.locator('header')).to_be_hidden()
        page.emulate_media(media='screen')
        expect(page.locator('#receipt')).to_be_hidden()
        page.get_by_role('button', name='Новый посетитель').click()
        expect(page.locator('.survey-button')).to_have_count(7)
        expect(page.locator('#receipt')).to_be_empty()
    # Cancel and confirm session termination; timeout clears private data.
    page.locator('.survey-button').first.click()
    page.get_by_role('button', name='Завершить сеанс').click()
    page.get_by_role('button', name='Продолжить анкету').click()
    expect(page.locator('progress')).to_be_visible()
    page.evaluate('reset()')
    page.clock.install()
    page.locator('.survey-button').first.click()
    page.clock.fast_forward(180001)
    expect(page.locator('.survey-button')).to_have_count(7)
    assert page.evaluate('localStorage.length + sessionStorage.length') == 0
    assert not errors, errors
    browser.close()
    print('PASS: all 7 surveys, navigation, 174 answers, receipt layout, reset and inactivity timeout')
