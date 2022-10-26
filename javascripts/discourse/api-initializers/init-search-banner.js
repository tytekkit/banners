import { apiInitializer } from "discourse/lib/api";
import { logSearchLinkClick } from "discourse/lib/search";

Array.prototype.random = function () {
  return this[Math.floor((Math.random()*this.length))];
}

function determineContrastingMonoFromImg(imageElement, callback) {
  let canvas = document.createElement('canvas'),
      img = document.createElement('img'),
      context = canvas.getContext && canvas.getContext('2d'),
      imgData, width, height, length,
      rgb = { r: 0, g: 0, b: 0 },
      count = 0;

      img.crossOrigin = "anonymous";
      img.src = imageElement;

  img.onload = function(){
    height =  canvas.height =
    img.naturalHeight ||
    img.offsetHeight ||
    img.height;
    width =   canvas.width =
    img.naturalWidth ||
    img.offsetWidth ||
    img.width;
    
    context.drawImage(img, 0, 0);
    imgData = context.getImageData(0, 0, width, height);
    length = imgData.data.length;

    for (var i = 0; i < length; i += 4) {
    rgb.r += imgData.data[i];
    rgb.g += imgData.data[i + 1];
    rgb.b += imgData.data[i + 2];
    count++;
    }

    rgb.r = Math.floor(rgb.r / count);
    rgb.g = Math.floor(rgb.g / count);
    rgb.b = Math.floor(rgb.b / count);

    let vals = Object.values(rgb),
        result = {"text" : "",
                  "bgAvg" : ""};

    result.text =
      ((vals.reduce((accumulator, value) => accumulator + value,0)) >= 382.5)
      ? "black" : "white";

    result.bgAvg = vals.toString();

    console.log(result.bgAvg);

    callback(result);
  }
}

export default apiInitializer("0.11.1", (api) => {

  const root = document.documentElement,
        bgImages = settings.background_images.split("|");

  if (bgImages.length) {
    const bgImg = bgImages.random();
    determineContrastingMonoFromImg(bgImg, function(results){
      root.style.setProperty('--bg-image', `url(${bgImg})`); // setting random bgImg
      root.style.setProperty('--bg-contrast', results.text); // white or black text contrasting w/ background
      root.style.setProperty('--bg-avg', results.bgAvg); // avg color of banner bg
    });
  }

  //console.log(averageColor(bgImages.random()));

  // Simplified version of header search theme component
  const searchWidget = api.container.factoryFor("widget:search-menu"),
        searchContents = searchWidget.class.prototype["panelContents"];

  api.reopenWidget("search-menu", {
    buildKey(attrs) {
      let type = attrs.formFactor || "menu";
      return `search-${type}`;
    },

    defaultState(attrs) {
      return {
        formFactor: attrs.formFactor || "menu",
        showHeaderResults: false,
        inTopicContext: attrs.inTopicContext,
      };
    },

    html(attrs, state) {
      if (this.state.formFactor === "widget") {
        return this.panelContents();
      } else {
        return this._super(attrs, state);
      }
    },

    mouseDownOutside() {
      const formFactor = this.state.formFactor;
      if (formFactor === "menu") {
        return this.sendWidgetAction("toggleSearchMenu");
      } else {
        this.state.showHeaderResults = false;
        this.scheduleRerender();
      }
    },

    click() {
      const formFactor = this.state.formFactor;
      if (formFactor === "widget") {
        this.showResults();
      }
    },

    showResults() {
      this.state.showHeaderResults = true;
      this.scheduleRerender();
    },

    linkClickedEvent(attrs) {
      if (attrs) {
        const { searchLogId, searchResultId, searchResultType } = attrs;
        if (searchLogId && searchResultId && searchResultType) {
          logSearchLinkClick({
            searchLogId,
            searchResultId,
            searchResultType,
          });
        }
      }

      const formFactor = this.state.formFactor;

      if (formFactor === "widget") {
        this.state.showHeaderResults = false;
        this.scheduleRerender();
      }
    },

    panelContents() {
      const formFactor = this.state.formFactor;
      let showHeaderResults =
        this.state.showHeaderResults == null ||
        this.state.showHeaderResults === true;
      let contents = [];

      if (formFactor === "widget") {
        contents.push(
          this.attach("button", {
            icon: "search",
            className: "search-icon",
            action: "showResults",
          })
        );
      }

      contents = contents.concat(...searchContents.call(this));
      let results = contents.find((w) => w.name === "search-menu-results");
      if (results && results.attrs.results) {
        $(".search-menu.search-header").addClass("has-results");
      } else {
        $(".search-menu.search-header").removeClass("has-results");
      }
      if (formFactor === "menu" || showHeaderResults) {
        return contents;
      } else {
        return contents.filter((widget) => {
          return (
            widget.name !== "search-menu-results" &&
            widget.name !== "search-context"
          );
        });
      }
    },
  });


  api.createWidget("search-widget", {
    tagName: "div.search-widget",
  });

  api.decorateWidget("search-widget:after", function (helper) {
    const searchWidget = helper.widget;
    const searchMenuVisible = searchWidget.state.searchVisible;

    if (!searchMenuVisible && !searchWidget.attrs.topic) {
      return helper.attach("search-menu", {
        contextEnabled: searchWidget.state.contextEnabled,
        formFactor: "widget",
      });
    }
  });

  // scroll handler for header

  document.addEventListener("scroll", (e) => {
    const header = document.querySelector("header");
    const searchBanner = document.querySelector("div.search-banner");
    var scrolled = document.documentElement.scrollTop || document.body.scrollTop;
    var scrollBool = (scrolled + 60 >= settings.banner_height_shown);
    header.setAttribute("scrolled", scrollBool);
    console.log(scrollBool);

  });
});

