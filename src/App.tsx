import React, { useEffect, useState } from 'react';

export let userApiKey = '';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [buttonClicked, setButtonClicked] = useState(false);


  function saveApiKey(apiKey: any) {
    chrome.storage.local.set({ apiKey: apiKey }, function () {
      console.log('API Key is saved');
    });
  }

  const handleUpdateApiKey = (newApiKey: any) => {

    setApiKey(newApiKey)

    chrome.storage.local.set({ apiKey: newApiKey }, () => {
      console.log("API Key updated sessionly:", newApiKey);
    });
  };

  // Inline CSS styles
  const styles: { [key: string]: React.CSSProperties } = {
    app: {
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center', // TypeScript now understands this is a valid value
      padding: '20px',
      backgroundColor: '#282c34',
      width: '300px',

    },
    header: {
      backgroundColor: '#282c34',
      padding: '20px',
      borderRadius: '10px',
      color: 'white',
    },
    input: {
      margin: '10px 0',
      padding: '10px',
      borderRadius: '5px',
      border: '1px solid #ddd',
      width: 'calc(100% - 22px)', // Account for padding and border
    },
    button: {
      backgroundColor: buttonClicked ? 'gray' : '#0077B6',

      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      color: 'white',
      marginTop: '10px',
    }
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <p>Enter Open API Key:</p>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => handleUpdateApiKey(e.target.value)}
          style={styles.input}
        />
        <button
          type="button" // Change to "button" if you're not actually submitting a form
          onClick={() => { setButtonClicked(true) }}
          style={styles.button}
          disabled={buttonClicked} // Optionally disable the button to prevent further clicks
        >
          Use
        </button>
      </header>
    </div>
  );
}

export default App;
