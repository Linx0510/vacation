const categories = [
  { id: 1, name: 'Сезонные' },
  { id: 2, name: 'Тематические' },
  { id: 3, name: 'Мастер-классы' },
  { id: 4, name: 'Выездные' },
];

const events = [
  {
    id: 'demo-steppe-festival',
    title: 'Фестиваль уличного искусства «Степь»',
    description: 'Главное культурное событие лета в Оренбурге: муралы, музыка, лекции об урбанистике и творческие мастерские для гостей всех возрастов.',
    category_id: 2,
    date: '2026-06-30',
    location: 'Оренбург, Советская 45',
    max_participants: 100,
    participants_count: 88,
    media_url: '/images/static/hero-illustration.svg',
    price: 500,
    status: 'approved',
    organizer_id: 1,
    first_name: 'Алексей',
    last_name: 'Филиппов',
    avatar: '/images/static/icon-audience.svg',
  },
  {
    id: 'demo-summer-picnic',
    title: 'Летний пикник в городском саду',
    description: 'Неспешная встреча на свежем воздухе с настольными играми, акустической музыкой и небольшим маркетом локальных проектов.',
    category_id: 1,
    date: '2026-07-05',
    location: 'Оренбург, Зауральная роща',
    max_participants: 60,
    participants_count: 34,
    media_url: '/images/static/cat-1.svg',
    price: 0,
    status: 'approved',
    organizer_id: 1,
    first_name: 'Команда',
    last_name: 'Вакация',
    avatar: '/images/static/icon-audience.svg',
  },
  {
    id: 'demo-ceramics-workshop',
    title: 'Мастер-класс по керамике',
    description: 'Двухчасовой практикум: создадим небольшую чашку или тарелку, разберем базовые техники лепки и подготовим изделие к обжигу.',
    category_id: 3,
    date: '2026-07-12',
    location: 'Оренбург, ул. Ленинская 28',
    max_participants: 18,
    participants_count: 12,
    media_url: '/images/static/cat-3.svg',
    price: 1200,
    status: 'approved',
    organizer_id: 2,
    first_name: 'Мария',
    last_name: 'Иванова',
    avatar: '/images/static/icon-camera.svg',
  },
  {
    id: 'demo-outdoor-yoga',
    title: 'Йога на рассвете у воды',
    description: 'Мягкая практика для любого уровня подготовки, дыхательные упражнения и чай после занятия. Коврик можно взять с собой.',
    category_id: 4,
    date: '2026-07-18',
    location: 'Оренбург, набережная Урала',
    max_participants: 30,
    participants_count: 21,
    media_url: '/images/static/cat-4.svg',
    price: 400,
    status: 'approved',
    organizer_id: 3,
    first_name: 'Анна',
    last_name: 'Смирнова',
    avatar: '/images/static/icon-heart.svg',
  },
];

function filterEvents(filters = {}) {
  const categoryMap = {
    seasonal: 1,
    thematic: 2,
    workshop: 3,
    outdoor: 4,
  };

  return events.filter((event) => {
    if (filters.status && event.status !== filters.status) return false;
    if (filters.category && filters.category !== 'all' && event.category_id !== categoryMap[filters.category]) return false;
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const text = `${event.title} ${event.description}`.toLowerCase();
      if (!text.includes(query)) return false;
    }
    if (filters.date_from && event.date < filters.date_from) return false;
    if (filters.date_to && event.date > filters.date_to) return false;
    if (filters.location && !event.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    return true;
  });
}

function findEventById(id) {
  return events.find((event) => String(event.id) === String(id));
}

module.exports = {
  categories,
  events,
  filterEvents,
  findEventById,
};
