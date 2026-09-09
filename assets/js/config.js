(function () {
  const API_URL = 'https://script.google.com/macros/s/AKfycbxu8y7OU7m9VyjOl5JgEQNZLjWrZTQam3VZa2RYZd_sGo6qK_pD6KvvelqSIH40ssXw/exec';
  window.SUNO_CONFIG = {
    API_URL,
    DEMO_MODE: !API_URL || API_URL.includes('COLE_AQUI'),
    SESSION_KEY: 'suno_importacoes_session',
    DEMO_STORAGE_KEY: 'suno_importacoes_demo_db_v1'
  };
})();
