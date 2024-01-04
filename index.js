const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const questions = [
  {
    text: "Ваш отель?",
    options: ["Twin Apart", "Aria Riva"],
    nextQuestion: 1,
  },
  {
    text: "Номер комнаты?",
    isTextAnswer: true,
    nextQuestion: 2,
  },
  {
    text: "Количество людей?",
    options: ["1", "2", "3"],
    nextQuestion: 3,
  },
  {
    text: "Выберите блюдо на завтрак ($person персона)",
    options: [
      "Breakfast Plate (турецкий завтрак)",
      "Italian Breakfast (круасан + добавки)",
      "Bowl Plate (йогурт/фрукты/мюсли)",
      "Breakfast on Bread (тосты авакадо/яйцо/рыба 2 шт)",
      "Ananas Dreams (йогурт/фрукты/мюсли)",
      "Crepe Plate (блины 2 шт + добавка)",
      "Aria Special Breakfast (глазунья со шпинатом и грибами, салат)",
      "Каша геркулес с добавками варенье/мед",
      "Омлет из 3х яиц",
    ],
    nextQuestion: null,
  },
];

const userAnswers = new Map();
const userQuestionIndex = new Map();
const chatIds = new Set()

let peopleLeft = 0;
let isInlineKeyboardAnswerExpected = false;

function startDailyReminder() {
  const hours = new Date().getHours()
  const minutes = new Date().getMinutes()

  if (hours === 23 && minutes == 44 && minutes <= 45) {
    chatIds.forEach((chatId) => {
      bot.sendMessage(
        chatId,
        "Не забудьте выбрать на завтрак! Используйте команду /select, чтобы выбрать"
      );
    });
  }
}

function collectData() {
  const data = [...userAnswers.values()]
    .flatMap((userAnswer) => userAnswer[questions[3].text])
    .reduce((acc, value) => {
      const count = acc[value];
      acc[value] = count ? count + 1 : 1;
      return acc;
    }, {})

  return data
}

setInterval(startDailyReminder, 1 * 60 * 60 * 1000);

// setInterval(collectData, 24 * 60 * 60 * 1000);

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const answer = query.data;

  processAnswer({ userId, chatId, answer, query: true })

  // Remove the inline keyboard after the user answers
  bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    { chat_id: chatId, message_id: query.message.message_id }
  );
})

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const answer = msg.textю

  if (userQuestionIndex.has(chatId) && (/^\/w+$/g.test(msg.text) || isInlineKeyboardAnswerExpected)) return

  processAnswer({ userId, chatId, answer });
});

bot.onText(/\/select/, async (msg) => {
  const chatId = msg.chat.id;

  if (userQuestionIndex.has(chatId)) return;

  await bot.sendPhoto(chatId, "./assets/menu.jpeg", { caption: "Фото меню" });
  await bot.sendPhoto(chatId, "./assets/omlet.jpeg", { caption: "Омлет из 3х яиц" });
  await bot.sendMessage(chatId,"Еще добавим простой вариант геркулесовой каши с добавками в виде варенья");

  sendQuestion(chatId, 0);
  chatIds.add(chatId);
});

bot.on("polling_error", (error) => {
  console.log(error);
});

bot.onText(/\/collect/, (msg) => {
  const data = collectData()
  const report = Object.entries(data).reduce((acc, [meal, count]) => acc + `${meal}: ${count}шт\n`, "");
  const day = `${new Date().getDay()}`.padStart(2, 0)
  const month = `${new Date().getMonth() + 1}`.padStart(2, 0)

  bot.sendMessage(msg.chat.id, `Завтраки на ${day}/${month}:\n` + report);
})

const getPeopleAmount = (userId) => {
  const answers = userAnswers.get(userId);
  if (!answers) return 0;
  return parseInt(answers[questions[2].text]);
};

function processAnswer({ userId, chatId, answer, query = false }) {
  if (!userQuestionIndex.has(chatId)) return;

  const currentQuestionIndex = userQuestionIndex.get(chatId);
  const currentQuestion = questions[currentQuestionIndex];

  if (currentQuestionIndex === 2) {
    peopleLeft = parseInt(currentQuestion.options[answer]);
  }

  if (currentQuestionIndex === 3) {
    const answers = userAnswers.get(userId);
    const meal = answers[questions[3].text];
    const mealSelection = currentQuestion.options[answer];

    peopleLeft -= 1;
    userAnswers.set(userId, {
      ...userAnswers.get(userId),
      [currentQuestion.text]: meal
        ? meal.concat(mealSelection)
        : [mealSelection],
    });
  } else {
    userAnswers.set(userId, {
      ...userAnswers.get(userId),
      [currentQuestion.text]: query ? currentQuestion.options[answer] : answer,
    });
  }

  // Check if there is a next question
  if (currentQuestionIndex < questions.length - 1) {
    sendQuestion(chatId, currentQuestionIndex + 1, userId);
  } else if (peopleLeft > 0) {
    sendQuestion(chatId, currentQuestionIndex, userId);
  } else {
    // End of the poll
    const answers = userAnswers.get(userId);
    const meals = answers[questions[3].text];
    const mealsMsg = meals.reduce((acc, meal) => `${acc}• ${meal}\n`, '');

    bot.sendMessage(chatId, "Вы выбрали следующие блюда:\n" + mealsMsg);
    // Log the user's answers (replace with your storage logic)
    console.log(`User ${userId} answers:`, userAnswers.get(userId));
    // Reset user's progress for future polls
    userQuestionIndex.delete(chatId);
  }
}

function sendQuestion(chatId, questionIndex, userId) {
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
    const options = question.options.map((option, index) => [{ text: option, callback_data: index }]);

    isInlineKeyboardAnswerExpected = true;
    bot.sendMessage(
      chatId,
      question.text.replace("$person", getPeopleAmount(userId) - peopleLeft + 1),
      {
        reply_markup: {
          inline_keyboard: options,
        },
      }
    );
  }
}