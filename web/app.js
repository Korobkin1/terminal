'use strict';
const app = document.querySelector('#app');
const receipt = document.querySelector('#receipt');
const home = document.querySelector('#home');
const dialog = document.querySelector('#confirm');
let surveys = {}, selected = null, answers = [], index = 0, completedAt = null;
let idleTimer;
let printing = false;
const labels = {yes: 'Да', no: 'Нет', skip: 'Пропущено'};
const groups = [
  ['Урология', ['urol_mkb', 'urol_dgpzh']],
  ['Репродуктивное здоровье', ['reprod_women', 'reprod_men']],
  ['Хронические заболевания', ['chronic_under65', 'chronic_over65']],
  ['Онкологическая анкета', ['onco_detect']]
];
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, handler, className) {
  const node = el('button', text, className);
  node.addEventListener('click', handler);
  return node;
}
function reset() {
  clearTimeout(idleTimer);
  selected = null; answers = []; index = 0; completedAt = null;
  receipt.replaceChildren(); receipt.hidden = true;
  home.hidden = true;
  if (dialog.open) dialog.close();
  menu();
}
function activity() {
  clearTimeout(idleTimer);
  if (selected && !printing) idleTimer = setTimeout(reset, 180000);
}
['pointerdown', 'keydown', 'scroll'].forEach(event => document.addEventListener(event, activity, {passive:true}));
home.onclick = () => dialog.showModal();
document.querySelector('#cancel-reset').onclick = () => dialog.close();
document.querySelector('#reset').onclick = reset;
function heading(text) {
  const h = el('h1', text);
  h.tabIndex = -1; app.append(h); h.focus();
}
function menu() {
  app.replaceChildren();
  app.append(el('p', 'АНКЕТИРОВАНИЕ', 'eyebrow'));
  heading('С чего начнём?');
  app.append(el('p', 'Выберите анкету и ответьте на вопросы. В конце можно распечатать ответы.', 'intro'));
  const grid = el('div', undefined, 'grid');
  for (const [title, ids] of groups) {
    const card = el('section', undefined, 'card');
    card.append(el('h2', title));
    for (const id of ids) {
      if (!surveys[id]) continue;
      const b = button('', () => {
        selected = id; answers = []; index = 0; home.hidden = false;
        activity(); question();
      }, 'survey-button');
      const count = surveys[id].questions.length;
      const word = count % 100 >= 11 && count % 100 <= 14 ? 'вопросов' : count % 10 === 1 ? 'вопрос' : [2, 3, 4].includes(count % 10) ? 'вопроса' : 'вопросов';
      b.append(el('span', surveys[id].name), el('small', `${count} ${word} →`));
      card.append(b);
    }
    grid.append(card);
  }
  app.append(grid);
}
function question() {
  app.replaceChildren();
  const survey = surveys[selected];
  app.append(el('p', survey.name, 'eyebrow'));
  app.append(el('p', `Вопрос ${index + 1} из ${survey.questions.length}`, 'counter'));
  const progress = el('progress');
  progress.max = survey.questions.length; progress.value = index;
  progress.setAttribute('aria-label', 'Прогресс заполнения'); app.append(progress);
  heading(survey.questions[index]);
  const actions = el('div', undefined, 'answers');
  for (const value of ['yes', 'no', 'skip']) {
    const b = button(value === 'skip' ? 'Пропустить' : labels[value], () => {
      answers[index] = value;
      if (index + 1 < survey.questions.length) { index++; question(); }
      else { completedAt = new Date(); result(); }
    }, value === 'skip' ? 'secondary' : '');
    b.setAttribute('aria-pressed', String(answers[index] === value));
    actions.append(b);
  }
  app.append(actions);
  if (index > 0) app.append(button('← Предыдущий вопрос', () => { index--; question(); }, 'secondary back'));
}
function counts() {
  return ['yes', 'no', 'skip'].map(value => answers.filter(a => a === value).length);
}
function fillReceipt() {
  receipt.replaceChildren();
  const survey = surveys[selected];
  receipt.append(el('h2', 'Результат анкетирования'), el('p', survey.name), el('p', completedAt.toLocaleString('ru-RU')));
  const [yes, no, skip] = counts();
  receipt.append(el('p', `Да: ${yes} · Нет: ${no} · Пропущено: ${skip}`));
  survey.questions.forEach((text, i) => {
    const row = el('div', undefined, 'receipt-row');
    row.append(el('p', `${i + 1}. ${text}`), el('strong', labels[answers[i]])); receipt.append(row);
  });
  receipt.append(el('p', 'Анкета не является диагнозом. Передайте ответы врачу для оценки.', 'note'));
}
function result() {
  app.replaceChildren(); fillReceipt();
  app.append(el('p', 'АНКЕТА ЗАВЕРШЕНА', 'eyebrow'));
  heading('Ваши ответы готовы');
  app.append(el('p', surveys[selected].name, 'intro'));
  const [yes, no, skip] = counts();
  app.append(el('p', `Да: ${yes} · Нет: ${no} · Пропущено: ${skip}`, 'summary'));
  app.append(el('p', 'Передайте ответы врачу для оценки. Автоматическое медицинское заключение не формируется.'));
  const controls = el('div', undefined, 'actions');
  const label = el('label', 'Ширина бумаги ');
  const width = el('select');
  for (const mm of [80, 58]) { const option = el('option', `${mm} мм`); option.value = mm; width.append(option); }
  const setWidth = () => {
    document.documentElement.style.setProperty('--paper', `${width.value}mm`);
    document.documentElement.style.setProperty('--printable', width.value === '58' ? '48mm' : '70mm');
  };
  width.onchange = setWidth; setWidth(); label.append(width); controls.append(label);
  controls.append(button('Распечатать результат', () => { activity(); window.print(); }));
  controls.append(button('Проверить ответы', () => { index = 0; question(); }, 'secondary'));
  controls.append(button('Новый посетитель', reset, 'secondary'));
  app.append(controls, el('p', 'В окне печати выберите термопринтер, такую же ширину бумаги, масштаб 100%, отключите колонтитулы.', 'hint'));
  const details = el('details'); details.append(el('summary', 'Посмотреть ответы'));
  const list = el('ol');
  surveys[selected].questions.forEach((text, i) => list.append(el('li', `${text} — ${labels[answers[i]]}`)));
  details.append(list); app.append(details);
}
window.addEventListener('beforeprint', () => { printing = true; clearTimeout(idleTimer); });
window.addEventListener('afterprint', () => { printing = false; activity(); });
fetch('/api/surveys').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(data => { surveys = data; menu(); })
  .catch(() => { app.replaceChildren(el('h1', 'Не удалось загрузить анкеты'), el('p', 'Перезапустите приложение и обновите страницу.')); });
