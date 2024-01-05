module.exports = [
  {
    text: 'Ваш отель?',
    options: ['Twin Apart', 'Aria Riva'],
    nextQuestion: 1,
  },
  {
    text: 'Номер комнаты?',
    isTextAnswer: true,
    nextQuestion: 2,
  },
  {
    text: 'Количество людей?',
    options: ['1', '2', '3'],
    nextQuestion: 3,
  },
  {
    text: 'Выберите блюдо на завтрак ($person персона)',
    options: [
      'Breakfast Plate (турецкий завтрак)',
      'Italian Breakfast (круасан + добавки)',
      'Bowl Plate (йогурт/фрукты/мюсли)',
      'Breakfast on Bread (тосты авакадо/яйцо/рыба 2 шт)',
      'Ananas Dreams (йогурт/фрукты/мюсли)',
      'Crepe Plate (блины 2 шт + добавка)',
      'Aria Special Breakfast (глазунья со шпинатом и грибами, салат)',
      'Каша геркулес с добавками варенье/мед',
      'Омлет из 3х яиц',
    ],
    nextQuestion: null,
  },
];
