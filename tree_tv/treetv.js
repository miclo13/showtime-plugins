/**
 * tree.tv plugin for Showtime
 *
 *  Copyright (C) 2014 lprot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

(function(plugin) {
    var PREFIX = 'treetv';
    var BASE_URL = 'http://tree.tv';
    var logo = plugin.path + "logo.png";
    var slogan = "Tree.tv - online фильмы - новинки кино в хорошем качестве смотреть бесплатно без регистрации онлайн"

    function setPageHeader(page, title) {
        page.loading = false;
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = logo;
        }
        page.type = "directory";
        page.contents = "items";
    }

    var service = plugin.createService("Tree.tv", PREFIX + ":start", "video", true, logo);

    var settings = plugin.createSettings("Tree.tv", logo, slogan);

    function trim(s) {
        return s.replace(/(\r\n|\n|\r)/gm, "").replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ").replace(/\t/g,'');
    }

    const blue = "6699CC", orange = "FFA500";

    function colorStr(str, color) {
        return '<font color="' + color + '"> (' + str + ')</font>';
    }

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    plugin.addURI(PREFIX + ":indexItem:(.*):(.*)", function(page, url, title) {
        setPageHeader(page, unescape(title));
        page.loading = true;
        var response = showtime.httpReq(BASE_URL + "/" + url).toString();
        page.loading = false;

        // 1-title, 2-front image, 3-back image, 4-nick, 5-date added, 6-views
        var match = response.match(/<div class="filmp">[\s\S]*?<h1>([\s\S]*?)<\/h1>[\s\S]*?<img src="([\s\S]*?)"[\s\S]*?<img src="([\s\S]*?)"[\s\S]*?<div class="nick"><span><\/span><a>([\s\S]*?)<\/a><\/div>[\s\S]*?<div class="date"><span><\/span>([\s\S]*?)<\/div>[\s\S]*?<div class="views"><span><\/span>([\s\S]*?)<\/div>/);
        if (match) {
           page.appendItem(match[2], 'image', {
               title: service.lang == "en" ? 'Poster' : 'Обложка',
               icon: match[2]
           });

           page.appendItem(match[3], 'image', {
               title: service.lang == "en" ? 'Thumbnails' : 'Миниатюры изображения',
               icon: match[3]
           });

           var description = response.match(/<div class="cont">([\s\S]*?)<\/div>/);
           if (description)
           var links = response.match(/var films= "([\s\S]*?)"/);
           if (links) {
               page.appendItem("", "separator", {
                  title: service.lang == "en" ? 'Video' : 'Видео'
               });

               var films = links[1].split("|||");
               for (n in films) {
                  page.appendItem("videoparams:" + showtime.JSONEncode({
                        sources: [{
                            url: films[n],
                            mimetype: "video/quicktime"
                        }],
                        title: match[1] + " (" + (service.lang == "en" ? 'part' : 'часть') + (+n+1) + ")"
                    }), 'video', {
                    title: new showtime.RichText(match[1] + colorStr((service.lang == "en" ? 'part' : 'часть') + (+n+1), blue)),
                    icon: match[2],
                    description: description ? new showtime.RichText(match[1] + "<br>" + coloredStr(service.lang == "en" ? 'Added: ' : 'Добавлено: ', orange) + match[5] + coloredStr(service.lang == "en" ? ' Views: ' : ' Просмотров: ', orange) + match[6] + " " + trim(description[1])) : ''
                  });
               }
           }
        }
    });

    plugin.addURI(PREFIX + ":listNew", function(page) {
        setPageHeader(page, 'New');
        // 1-link, 2-icon, 3-title, 4-genre
        var re = /<div class="item_zag">[\s\S]*?<a href="([\s\S]*?)"[\s\S]*?<img src="([\s\S]*?)" alt="([\s\S]*?)">[\s\S]*?<a href="[\s\S]*?">([\s\S]*?)<\/a>/g;
        var p = 2;

        function loader() {
            page.loading = true;
            var response = showtime.httpReq(BASE_URL + (service.lang == "en" ? '/en/' : '/') + "?page=" + p).toString();
            page.loading = false;

            var match = re.exec(response);
            while (match) {
                page.appendItem(PREFIX + ":indexItem:" + match[1] + ":" + escape(match[3]), 'video', {
                    title: new showtime.RichText(match[3] + colorStr(match[4], blue)),
                    genre: match[4],
                    description: match[3],
                    icon: match[2]
                });
                match = re.exec(response);
            }
            match = response.match(/<span>([\S\s]*?)<\/span><\/li><\/ul>/);
            if (!match) {
               p++;
               return true;
            };
            return false;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addURI(PREFIX + ":indexItem:(.*)", function(page, url) {
        page.loading = true;
        var doc = showtime.httpReq(BASE_URL + url).toString();
        page.loading = false;

        setPageHeader(page, doc.match(/<title>([\s\S]*?)<\/title>/)[1]);

        // 1-title, 2-icon, 3-views, 4-comments, 5-screenshots, 6-quality,
        // 7-genre, 8-year, 9-country, 10-director, 11-soundtrack, 12-duration,
        // 13-actors, 14-description, 15-added by, 16-info, 17-rating
        var re = /<div class="content_open">[\s\S]*?<img alt="([\s\S]*?)"[\s\S]*?src="([\s\S]*?)"[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div class="screens">([\s\S]*?)<div class="item_right">[\s\S]*?<div class="quality_film"([\s\S]*?)<\/div>[\s\S]*?<div class="section_item list_janr">([\s\S]*?)<\/div>[\s\S]*?href="#">([\s\S]*?)<\/a>[\s\S]*?<span class="item">([\s\S]*?)<\/span>[\s\S]*?<div class="span_content">([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div class="ava_actors"([\s\S]*?)<div class="section_item">[\s\S]*?<div class="description">([\s\S]*?)<\/div>[\s\S]*?<span>([\s\S]*?)<\/span>([\s\S]*?)<div class="rait_other">[\s\S]*?<span class="green">([\s\S]*?)<\/span>/g;
        var match = re.exec(doc);
        while (match) {
            // scraping genres list
            var re2 = /href="#">([\s\S]*?)<\/a>/g;
            var genre = '';
            if (match[7]) {
                var match2 = re2.exec(match[7]);
                while (match2) {
                    genre += match2[1];
                    match2 = re2.exec(match[7]);
                }
            }
            // scraping actors list
            re2 = /<div class="actors_content">([\s\S]*?)<\/div>/g;
            var actors = '', first = 0;
            if (match[13]) {
                match2 = re2.exec(match[13]);
                while (match2) {
                    if (!first) {
                        actors += trim(match2[1]);
                        first++;
                    } else
                        actors += ', ' + trim(match2[1]);
                    match2 = re2.exec(match[13]);
                }
            }
            var info = match[16].match(/<div class="new_series">([\s\S]*?)<\/div>/);
            page.appendItem(PREFIX + ":indexItem:" + match[1] + ":" + escape(match[3]), 'video', {
                title: new showtime.RichText(match[1]),
                icon: BASE_URL + match[2],
                genre: genre,
                year: +match[8],
                rating: match[17] * 10,
                duration: match[12],
                description: new showtime.RichText(coloredStr("Просмотров: ", orange) +
                    trim(match[3]) + coloredStr(" Коментариев: ", orange) + match[4] +
                    coloredStr(" Добавил: ", orange) + match[15] +
                    coloredStr("<br>Страна: ", orange) + match[9] +
                    coloredStr("<br>Режиссер: ", orange) + trim(match[10]) +
                    coloredStr("<br>Актеры: ", orange) + actors +
                    coloredStr("<br>Перевод: ", orange) + match[11] +
                    (info ? coloredStr("<br>Инфо: ", orange) + trim(info[1]) : '') +
                    coloredStr("<br>Описание: ", orange) + trim(match[14]))
            });
            match = re.exec(doc);
        }
        // 1-title, 2-resolution's list
        re = /<div class="accordion_head folder_name"[\s\S]*?title="([\s\S]*?)"([\s\S]*?)<\/select>/g;
        match = re.exec(doc);
        while (match) {
            re2 = /<option value=[\s\S]*?>([\s\S]*?)<\/option>/g;
            match2 = re2.exec(match[2]);
            while (match2) {
                page.appendItem(PREFIX + ":listFolder:" + match[1] + ":" + escape(match[3]), 'directory', {
                    title:
                });
            match = re.exec(doc);

    });

    function startPage(page) {
        setPageHeader(page, slogan);

        page.loading = true;
        var doc = showtime.httpReq(BASE_URL).toString();
        page.loading = false;

        // Building menu
        var htmlBlock = doc.match(/<div class="top_menu"([\s\S]*?)<\/div>/);
        if (htmlBlock) {
            // 1 - nameforhref, 2 - title
            var re = /<a href="([\s\S]*?)">([\s\S]*?)</g;
            var match = re.exec(htmlBlock[1]);
            while (match) {
                page.appendItem(PREFIX + ":submenu:" + match[1], 'directory', {
                   title: match[2]
                });
                match = re.exec(htmlBlock[1]);
            }
        }

        // Building top 20
        htmlBlock = doc.match(/<div class="popular_content">([\s\S]*?)<\/div>/);
        if (htmlBlock) {
            page.appendItem("", "separator", {
                title: 'Топ-20'
            });
            //1 - link, 2 - title, 3-icon
            re = /<a href="([\s\S]*?)" title="([\s\S]*?)">[\s\S]*?src="([\s\S]*?)">/g;
            match = re.exec(htmlBlock[1]);
            while (match) {
                page.appendItem(PREFIX + ":indexItem:" + match[1], 'video', {
                   title: match[2],
                   icon: BASE_URL + match[3]
                });
                match = re.exec(htmlBlock[1]);
            }
        }

        // Building list
        page.appendItem("", "separator");

        page.entries = 0;
        var fromPage = 1, tryToSearch = true;
        //1-link, 2-title, 3-icon, 4-added, 5-views, 6-rating, 7-quality, 8-genre,
        //9-year, 10-country, 11-director, 12-actors, 13-translation, 14-duration,
        //15-description, 16-info
        re = /<div class="item open">[\s\S]*?<a href="([\s\S]*?)">[\s\S]*?<img alt="([\s\S]*?)"[\s\S]*?src="([\s\S]*?)"[\s\S]*?<span class="[\s\S]*?">([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div class="rating">([\s\S]*?)<\/div>[\s\S]*?<span class="quality[\s\S]*?">([\s\S]*?)<\/span>[\s\S]*?Жанр<\/span>([\s\S]*?)<\/span>[\s\S]*?rel="year1" href="#">([\s\S]*?)<\/a>[\s\S]*?<span class="section_item_list">([\s\S]*?)<\/span>[\s\S]*?<span class="section_item_list">([\s\S]*?)<\/span>[\s\S]*?<span class="section_item_list">([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div class="description">([\s\S]*?)<\/div>([\s\S]*?)<div class="add_to">/g;

        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var doc = showtime.httpReq(BASE_URL + '/default/index/list?sortType=new&type=list&page='+fromPage).toString();
            page.loading = false;
            match = re.exec(doc);
            while (match) {
                var re2 = /href="#">([\s\S]*?)<\/a>/g;
                var genre = '';
                if (match[8]) {
                    var match2 = re2.exec(match[8]);
                    while (match2) {
                        genre += match2[1];
                        match2 = re2.exec(match[8]);
                    }
                }
                var rating = match[6].match(/<span class="green">/g);
                var info = match[16].match(/<div class="item_inform_text fl_left">([\s\S]*?)<\/div>/);
                page.appendItem(PREFIX + ":indexItem:" + match[1], 'video', {
                    title: new showtime.RichText(coloredStr(match[7], blue) + ' ' + match[2]),
                    icon: BASE_URL + match[3],
                    rating:  rating ? rating.length * 10 : 0,
                    genre: genre,
                    year: +match[9],
                    duration: match[14],
                    description: new showtime.RichText(coloredStr("Добавлен: ", orange) +
                        trim(match[4]) + coloredStr(" Просмотров: ", orange) + match[5] +
                        coloredStr("<br>Страна: ", orange) + match[10] +
                        coloredStr("<br>Режиссер: ", orange) + match[11] +
                        coloredStr("<br>Актеры: ", orange) + match[12] +
                        coloredStr("<br>Перевод: ", orange) + match[13] +
                        (info ? coloredStr("<br>Инфо: ", orange) + trim(info[1]) : '') +
                        coloredStr("<br>Описание: ", orange) + trim(match[15]))
                });
                page.entries++;
                match = re.exec(doc);
            }
            if (!doc.match(/<a href="#">Показать ещё<\/a>/)) return tryToSearch = false;
            fromPage++;
            return true;
        }
        loader();
        page.paginator = loader;
    };

    plugin.addURI(PREFIX + ":start", startPage);

    plugin.addSearcher("Tree.tv", logo, function(page, query) {
        page.entries = 0;
        var fromPage = 1, tryToSearch = true;
        // 1-link, 2-title, 3-icon, 4-genre
        var re = /<div class="item_zag"><a href="([\s\S]*?)" title="([\s\S]*?)"[\s\S]*?<img src="([\s\S]*?)"[\s\S]*?<a href="[\s\S]*?" title="([\s\S]*?)"/g;
        var re2 = /<span>([\S\s]*?)<\/span><\/li><\/ul>/;

        function loader() {
            if (!tryToSearch) return false;
            var response;
            if (fromPage == 1)
               response = showtime.httpReq(BASE_URL + (service.lang == "en" ? '/en/' : '/') + 'search_results.html?search=' + query.replace(/\s/g, '\+'));
            else
               response = showtime.httpReq(BASE_URL + (service.lang == "en" ? '/en/' : '/') + 'search_results.html?search=' + query.replace(/\s/g, '%20') + '&page=' + fromPage);
            var match = re.exec(response);
            while (match) {
                page.appendItem(PREFIX + ":indexItem:" + match[1] + ":" + escape(match[2]), 'video', {
                    title: new showtime.RichText(match[2] + colorStr(match[4], blue)),
                    genre: match[4],
                    description: match[2],
                    icon: BASE_URL + match[3]
                });
                page.entries++;
                match = re.exec(response);
            };

            if (re2.exec(response)) return tryToSearch = false;
            fromPage++;
            return true;
        };
        loader();
        page.paginator = loader;
    });
})(this);