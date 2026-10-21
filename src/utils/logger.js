export const logger = {
  info(message, data) {
    if (data === undefined) {
      console.log(message);
      return;
    }

    console.log(message, data);
  },

  warn(message, data) {
    if (data === undefined) {
      console.warn(message);
      return;
    }

    console.warn(message, data);
  },

  error(message, data) {
    if (data === undefined) {
      console.error(message);
      return;
    }

    console.error(message, data);
  },
};