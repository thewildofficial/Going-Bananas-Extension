export const getApiUrl = async (): Promise<string> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiUrl: 'http://localhost:3000/api' }, (data) => {
      resolve(data.apiUrl);
    });
  });
};