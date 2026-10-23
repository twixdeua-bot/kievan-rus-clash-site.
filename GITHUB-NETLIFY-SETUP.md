# KIEVAN RUS — GitHub / Netlify

## Важно
Этот архив содержит исходники сайта в корне проекта, включая `netlify/functions/`. Функции Netlify не запускаются при обычной ручной загрузке статических файлов; сайт нужно связать с Git-репозиторием и выполнить deploy/build.

## Загрузка в GitHub
1. Откройте репозиторий `twixdeua-bot/kievan-rus-clash-site`.
2. Нажмите Add file → Upload files.
3. Распакуйте архив на устройстве и загрузите СОДЕРЖИМОЕ папки (файлы `index.html`, папки `css`, `js`, `netlify`, `netlify.toml` и т.д.), не сам ZIP и не внешнюю папку.
4. Нажмите Commit changes.

## Подключение Netlify
1. В Netlify откройте существующий сайт `inquisitive-elf-88753f` → Site configuration → Build & deploy / Continuous deployment.
2. Подключите GitHub repository `twixdeua-bot/kievan-rus-clash-site`, production branch `main`.
3. Build command оставьте пустым; publish directory `.`. `netlify.toml` указывает папку функций `netlify/functions`.
4. Сохраните существующую переменную окружения `CLASH_ROYALE_API_KEY` в Netlify UI. Не записывайте ключ в GitHub и не добавляйте его в код.
5. Запустите production deploy и дождитесь завершения сборки.
6. Проверьте `/.netlify/functions/clan` и `/.netlify/functions/rewards`. Если URL функции возвращает 404, откройте deploy log и убедитесь, что функции обнаружены/загружены.

## Важно про статистику колод
В этой исходной версии нет проверенной рабочей функции `deck-stats`; я не добавляю фиктивные значения. Сначала нужно подтвердить, что Netlify корректно публикует функции `clan` и `rewards`, затем отдельно подключать источник глобальной статистики и показывать данные только для совпавших колод.
