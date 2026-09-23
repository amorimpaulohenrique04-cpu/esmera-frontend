export const MENU_NAVIGATION_REQUEST_EVENT = "esmera:menu-navigation-request";

export interface MenuNavigationRequestDetail {
  navigate: () => void;
}
