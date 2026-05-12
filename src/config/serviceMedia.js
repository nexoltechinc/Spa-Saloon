const FALLBACK_IMAGE = '/images/hero.png';

const HAZEL_IMAGE_LIBRARY = {
  bridal: [
    '/images/hazel/Bridal/bulbul-ahmed-arn2mcDxcEk-unsplash.jpg',
    '/images/hazel/Bridal/bulbul-ahmed--qlW60EuUqU-unsplash.jpg',
    '/images/hazel/Bridal/the-artist-studio-fKZSH1fQIw8-unsplash.jpg',
    '/images/hazel/Bridal/the-artist-studio-27pGOj-JyX4-unsplash.jpg',
    '/images/hazel/Bridal/the-artist-studio-oeKiBmplBtU-unsplash.jpg',
  ],
  facial: [
    '/images/hazel/Facial/engin-akyurt-g-m8EDc4X6Q-unsplash.jpg',
    '/images/hazel/Facial/kimia-kazemi-u93nTfWqR9w-unsplash.jpg',
    '/images/hazel/Facial/soheil-kmp-qJ1mYraktLg-unsplash.jpg',
  ],
  hair: [
    '/images/hazel/Hairs/engin-akyurt-4du1ZBIscOM-unsplash.jpg',
    '/images/hazel/Hairs/adam-winger-FkAZqQJTbXM-unsplash.jpg',
    '/images/hazel/Hairs/jagadshd-1JEr_PNa5EY-unsplash.jpg',
    '/images/hazel/Hairs/jessie-dee-dabrowski-www-jessiedee-net-W6cwaL7PMSw-unsplash.jpg',
  ],
  nails: [
    '/images/hazel/Nails/bryony-elena-KZKbGgQPCtU-unsplash.jpg',
    '/images/hazel/Nails/farhad-ibrahimzade-Ng2uqWHLyHo-unsplash.jpg',
    '/images/hazel/Nails/jodene-isakowitz-hvqHtZqNMeI-unsplash.jpg',
  ],
};

const HAZEL_CATEGORY_GROUPS = {
  'hair-services': 'hair',
  'facial-skin-care': 'facial',
  'makeup-services': 'bridal',
  'threading-waxing': 'facial',
  'nail-services': 'nails',
  'spa-massage': 'facial',
  'bridal-packages': 'bridal',
};

const hashString = (value = '') => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash >>> 0;
};

const getHazelImageGroup = (categoryId) => HAZEL_IMAGE_LIBRARY[HAZEL_CATEGORY_GROUPS[categoryId] || 'facial'] || [];

export const resolveHazelImage = (categoryId, seed = '') => {
  const images = getHazelImageGroup(categoryId);

  if (!images.length) {
    return FALLBACK_IMAGE;
  }

  const index = hashString(`${categoryId || 'default'}:${seed || ''}`) % images.length;
  return images[index];
};

export const resolveHazelCategoryImage = (categoryId) => resolveHazelImage(categoryId, `${categoryId}-category`);

export const HAZEL_IMAGE_LIBRARY_KEYS = Object.keys(HAZEL_IMAGE_LIBRARY);
