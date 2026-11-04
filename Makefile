.PHONY: install dev host build preview serve test lint format clean

install:
	npm install

dev:
	npm run dev

host:
	npm run dev:host

build:
	npm run build

preview:
	npm run preview:host

serve:
	npm run serve

test:
	npm test

lint:
	npm run lint

format:
	npm run format

clean:
	rm -rf dist
