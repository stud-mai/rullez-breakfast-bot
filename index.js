require('dotenv').config();
require('./server');

const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const questions = require('./questions');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const userAnswers = new Map();
const userQuestionIndex = new Map();
const chatIds = new Set();

let peopleLeft = 0;
let isInlineKeyboardAnswerExpected = false;

function collectData() {
  const data = [...userAnswers.values()]
    .flatMap((userAnswer) => userAnswer[questions[3].text])
    .reduce((acc, value) => {
      const count = acc[value];
      acc[value] = count ? count + 1 : 1;
      return acc;
    }, {});

  return data;
}

function scheduleDailyReminder() {
  // Schedule an event every day at 08:30 and 22:30
  // const dailySchedule = "30 8,22 * * *";

  // Define the schedule rule with the timezone option
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'Europe/Istanbul';
  rule.hour = [8, 22];
  rule.minutes = 30;

  schedule.scheduleJob(rule, (fireDate) => {
    console.log(`Daily reminder event triggered at ${fireDate}`);
    chatIds.forEach((chatId) => {
      if (userAnswers.has(chatId)) return;
      bot.sendMessage(
        chatId,
        'Не забудьте выбрать еду на завтрак! Используйте для этого команду /select',
      );
    });
  });
}

scheduleDailyReminder();

function scheduleDailyCleanUp() {
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'Europe/Istanbul';
  rule.hour = 12;

  schedule.scheduleJob(rule, (fireDate) => {
    console.log(`Data cleanup event triggered at ${fireDate}`);
    userAnswers.clear();
  });
}

scheduleDailyCleanUp();

const getPeopleAmount = (chatId) => {
  const answers = userAnswers.get(chatId);
  if (!answers) return 0;
  return parseInt(answers[questions[2].text], 10);
};

function sendQuestion(chatId, questionIndex) {
  const question = questions[questionIndex];

  userQuestionIndex.set(chatId, questionIndex);

  if (question.isTextAnswer) {
    isInlineKeyboardAnswerExpected = false;
    bot.sendMessage(chatId, question.text, {
      reply_markup: {
        force_reply: true,
      },
    });
  } else {
    const options = question.options.map((option, index) => [
      { text: option, callback_data: index },
    ]);

    isInlineKeyboardAnswerExpected = true;
    bot.sendMessage(
      chatId,
      question.text.replace(
        '$person',
        getPeopleAmount(chatId) - peopleLeft + 1,
      ),
      {
        reply_markup: {
          inline_keyboard: options,
        },
      },
    );
  }
}

function processAnswer({ chatId, answer, query = false }) {
  if (!userQuestionIndex.has(chatId)) return;

  const currentQuestionIndex = userQuestionIndex.get(chatId);
  const currentQuestion = questions[currentQuestionIndex];

  if (currentQuestionIndex === 2) {
    peopleLeft = parseInt(currentQuestion.options[answer], 10);
  }

  if (currentQuestionIndex === 3) {
    const answers = userAnswers.get(chatId);
    const meal = answers[questions[3].text];
    const mealSelection = currentQuestion.options[answer];

    peopleLeft -= 1;
    userAnswers.set(chatId, {
      ...userAnswers.get(chatId),
      [currentQuestion.text]: meal
        ? meal.concat(mealSelection)
        : [mealSelection],
    });
  } else {
    userAnswers.set(chatId, {
      ...userAnswers.get(chatId),
      [currentQuestion.text]: query ? currentQuestion.options[answer] : answer,
    });
  }

  // Check if there is a next question
  if (currentQuestionIndex < questions.length - 1) {
    sendQuestion(chatId, currentQuestionIndex + 1);
  } else if (peopleLeft > 0) {
    sendQuestion(chatId, currentQuestionIndex);
  } else {
    // End of the poll
    const answers = userAnswers.get(chatId);
    const meals = answers[questions[3].text];
    const mealsMsg = meals.reduce((acc, meal) => `${acc}• ${meal}\n`, '');

    bot.sendMessage(chatId, `Вы выбрали следующие блюда:\n${mealsMsg}`);
    // Log the user's answers (replace with your storage logic)
    console.log(`User ${chatId} answers:`, userAnswers.get(chatId));
    // Reset user's progress for future polls
    userQuestionIndex.delete(chatId);
  }
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name;

  bot.sendMessage(
    chatId,
    `Привет ${userName}!\n\n`
    + 'Для выбора завтрака нужно отправить команду /select и ответить на вопросы бота.\n'
    + 'Если необходимо изменить выбор завтрака отправьте команду /reselect.\n\n'
    + 'Каждый день бот будет присылать напоминание о том, что надо выбрать завтрак на следующий день.',
  );

  chatIds.add(chatId);
});

bot.onText(/\/select/, async (msg) => {
  const chatId = msg.chat.id;

  if (userQuestionIndex.has(chatId)) {
    bot.sendMessage(chatId, 'Сперва закончите начатый выбор завтрака');
    return;
  }

  if (userAnswers.has(chatId)) {
    await bot.sendMessage(chatId, 'Вы уже выбрали завтрак');
    await bot.sendMessage(
      chatId,
      'Чтобы изменить выбор воспользуйтесь командой /reselect',
    );
    return;
  }

  await bot.sendPhoto(chatId, './assets/menu.jpeg', { caption: 'Фото меню' });
  await bot.sendPhoto(chatId, './assets/omlet.jpeg', {
    caption: 'Омлет из 3х яиц',
  });
  await bot.sendMessage(
    chatId,
    'Еще добавим простой вариант геркулесовой каши с добавками в виде варенья',
  );

  sendQuestion(chatId, 0);
});

bot.onText(/\/reselect/, async (msg) => {
  const chatId = msg.chat.id;

  if (userQuestionIndex.has(chatId)) {
    bot.sendMessage(chatId, 'Сперва закончите начатый выбор завтрака');
    return;
  }

  await bot.sendPhoto(chatId, './assets/menu.jpeg', { caption: 'Фото меню' });
  await bot.sendPhoto(chatId, './assets/omlet.jpeg', {
    caption: 'Омлет из 3х яиц',
  });
  await bot.sendMessage(
    chatId,
    'Еще добавим простой вариант геркулесовой каши с добавками в виде варенья',
  );

  sendQuestion(chatId, 0);
  userAnswers.delete(chatId);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const answer = msg.text;

  if (/^\/\w+/g.test(msg.text)) return;
  if (userQuestionIndex.has(chatId) && isInlineKeyboardAnswerExpected) {
    bot.sendMessage(chatId, 'Сперва закончите начатый выбор завтрака');
    return;
  }

  processAnswer({ chatId, answer });
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const answer = query.data;

  processAnswer({ chatId, answer, query: true });

  // Remove the inline keyboard after the user answers
  bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: query.message.message_id },
  );
});

bot.on('polling_error', (error) => {
  console.error(error);
});

bot.onText(/\/debug/, () => {
  console.log('===-- DEBUG --===');
  console.log('chats', chatIds);
  console.log('answers', userAnswers);
});

bot.onText(/\/collect/, (msg) => {
  const data = collectData();
  const report = Object.entries(data).reduce(
    (acc, [meal, count]) => `${acc}${meal}: ${count}шт\n`,
    '',
  );
  const hour = new Date().getHours();
  const day = `${new Date().getDate() + Math.floor(hour / 12)}`.padStart(2, 0);
  const month = `${new Date().getMonth() + 1}`.padStart(2, 0);

  bot.sendMessage(msg.chat.id, `Завтраки на ${day}/${month}:\n${report}`);
});
