/* JS Cookies - https://www.w3schools.com/js/js_cookies.asp */
export function setCookie(data) {
  if (data.days) {
    data.date = new Date();
    data.date.setTime(data.date.getTime() + data.days * 24 * 60 * 60 * 1000);
  }
  if (data.date) {
    data.expires = 'expires=' + data.date.toUTCString();
  }
  document.cookie =
    data.name + '=' + data.value + (data.expires ? ';' + data.expires : '') + ';path=/';
}

export function getCookie(cname) {
  var name = cname + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

export function getDeviceToken() {
  var token = getCookie('deviceToken');
  if (!token) {
    token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    setCookie({ name: 'deviceToken', value: token, days: 365 * 5 });
  }
  return token;
}
