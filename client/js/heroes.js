'use strict';
/*exported getSuperHero */
var animals = [ 'adder', 'ant', 'anteater', 'antelope', 'badger', 'bat',
		'bear', 'beaver', 'bee', 'beetle', 'bird', 'bison', 'boar', 'buffalo',
		'bull', 'butterfly', 'calf', 'camel', 'canary', 'cat', 'caterpillar',
		'centipede', 'chameleon', 'cheetah', 'chicken', 'chimpanzee', 'cicada',
		'cockroach', 'condor', 'cougar', 'cow', 'coyote', 'crab',
		'cricket', 'crocodile', 'crow', 'deer', 'dog', 'dolphin', 'donkey',
		'dragonfly', 'dromedary', 'duck', 'eagle', 'elephant', 'elk', 'falcon',
		'ferret', 'fish', 'fly', 'fox', 'frog', 'giraffe', 'goat', 'goldfish',
		'goose', 'gorilla', 'grasshopper', 'groundhog', 'hamster', 'hare',
		'hedgehog', 'hen', 'hippopotamus', 'horse', 'hyena', 'iguana',
		'jackal', 'jaguar', 'kangaroo', 'lamb',
		'leopard', 'lion', 'lizard', 'lobster', 'locust', 'lynx', 'mammoth',
		'mare', 'marten', 'mink', 'mole', 'monkey', 'moose', 'mosquito',
		'moth', 'mouse', 'mule', 'octopus', 'orangutan', 'ostrich', 'otter',
		'owl', 'ox', 'oyster', 'panda', 'panther', 'parakeet', 'parrot',
		'peacock', 'pelican', 'penguin', 'pheasant', 'pig', 'pigeon', 'dove',
		'pony', 'porcupine', 'rabbit', 'raccoon', 'rat', 'reindeer',
		'rhinoceros', 'salamander', 'scorpion', 'seal', 'shark', 'sheep',
		'sheepdog', 'sloth', 'slug', 'snail', 'snake', 'spider', 'squirrel',
		'stag', 'stork', 'swan', 'tiger', 'toad', 'tortoise', 'turkey',
		'turtle', 'viper', 'vixen', 'vulture', 'walrus', 'wasp', 'weasel',
		'whale', 'wolf', 'worm', 'zebra' ];

var beginHeroes = ['captain','super','ultra','wonder','mega','lord','black','white'];
var endHeroes = ['man','woman','boy','girl','diamond','shadow','rider'];

var getCapitalize = function(list) {
	var string = list[Math.round(Math.random()*(list.length-1))];
	return string.charAt(0).toUpperCase() + string.slice(1);
};

var getSuperHero = function() {
	var animal = getCapitalize(animals);
	var heroBeg = getCapitalize(beginHeroes);
	var heroEnd = getCapitalize(endHeroes);
	return (Math.random()*10 > 4) ? animal + heroEnd : heroBeg + animal;
};