import { useState, useEffect } from 'react';

export const useHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('meteringHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const addRecord = (record) => {
    const updatedHistory = [record, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('meteringHistory', JSON.stringify(updatedHistory));
  };

  const deleteRecord = (timestamp) => {
    const updatedHistory = history.filter(record => record.timestamp !== timestamp);
    setHistory(updatedHistory);
    localStorage.setItem('meteringHistory', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('meteringHistory');
  };

  return {
    history,
    addRecord,
    deleteRecord,
    clearHistory
  };
};