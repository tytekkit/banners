import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { computed } from "@ember/object";
import { defaultHomepage } from "discourse/lib/utilities";
import { and } from "@ember/object/computed";
import discourseComputed, { observes } from "discourse-common/utils/decorators";

export default Component.extend({
  router: service(),
  tagName: "",

  bannerLinks: computed(function () {
    return JSON.parse(settings.banner_links);
  }),

  @discourseComputed("router.currentRouteName")
  displayForRoute(currentRouteName) {
    const showOn = settings.show_on;
    if (showOn === "homepage") {
      return currentRouteName === `discovery.${defaultHomepage()}`;
    } else if (showOn === "top_menu") {
      return this.siteSettings.top_menu
        .split("|")
        .any((m) => `discovery.${m}` === currentRouteName);
    } else {
      // "all"
      return (
        currentRouteName !== "full-page-search" &&
        !currentRouteName.startsWith("admin.")
      );
    }
  },

  @discourseComputed("currentUser")
  displayForUser(currentUser) {
    const showFor = settings.show_for;
    if (showFor === "everyone") {
      return true;
    } else if (showFor === "logged_out" && !currentUser) {
      return true;
    } else if (showFor === "logged_in" && currentUser) {
      return true;
    }
    return false;
  },

  shouldDisplay: and("displayForUser", "displayForRoute"),
  showSearch: settings.Show_search_in_banner,

});
