class GlobalContext {
  commandLine: {
    resourcePath: string;
    debug: boolean;
  } = {
    resourcePath: '',
    debug: false,
  };
}

export default new GlobalContext();
