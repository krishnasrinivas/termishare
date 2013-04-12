function $(el) {
  return document.getElementById(el);
}

function inherit(derived, base) {
  for (property in base) {
    if (!derived[property]) {
      derived[property] = base[property];
    }
  }
}

var logging = {
  DEBUG : 10,
  INFO : 20,
  WARNING : 30,
  ERROR : 40,
  CRITICAL : 50,

  log : function(level, msg) {
    console.log(msg);
  }
};
DEBUG = logging.DEBUG;
INFO = logging.INFO;
WARNING = logging.WARNING;
ERROR = logging.ERROR;
CRITICAL = logging.CRITICAL;

Components = null;
