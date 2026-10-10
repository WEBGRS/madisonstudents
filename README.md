# Madison Students

The front page of [madisonstudents.com](https://madisonstudents.com): free tools for students in Madison, WI.

| Tool | Address | Repository |
|---|---|---|
| Courses: grade history, GPA by instructor, sections, schedule planner | [courses.madisonstudents.com](https://courses.madisonstudents.com) | [uw-course-lookup](https://github.com/WEBGRS/uw-course-lookup) |
| Housing: rentals near campus on one map | [housing.madisonstudents.com](https://housing.madisonstudents.com) | [madison-rentals](https://github.com/WEBGRS/madison-rentals) |
| Food: every place to eat, ratings from six platforms | [food.madisonstudents.com](https://food.madisonstudents.com) | [madison-food-map](https://github.com/WEBGRS/madison-food-map) |
| Campus guide: everyday places around campus, with sources | [guide.madisonstudents.com](https://guide.madisonstudents.com) | [madison-campus-guide](https://github.com/WEBGRS/madison-campus-guide) |
| News: daily UW–Madison and Madison news, rated and summarized in Chinese | [news.madisonstudents.com](https://news.madisonstudents.com) | [uw-digest](https://github.com/WEBGRS/uw-digest) |

One static page (English / 中文, follows the browser language), served by GitHub Pages. Edit `src/index.template.html` and run `python src/build.py` to write `index.html`; the hero map is drawn from OpenStreetMap lake outlines (`src/data`, projected by `src/lakes.py`). Card pictures in `img/` are screenshots of each tool. `feedback.js` is the shared feedback widget.

Independent student project, not affiliated with the University of Wisconsin–Madison.
