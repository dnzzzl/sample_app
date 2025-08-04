import logo from './logo.svg';
import './App.css';
function getToken()
{
  const url = 'http://localhost:3001/api/oauth/token';
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {
      "Content-Type": "application/json"
    }
  };

  return fetch(url, options)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      console.log('Token received:', data);
      return data.access_token;
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
      throw error;
    }
  );
}
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <button onClick={() => getToken().then(token => console.log('Token:', token))}>
          Get Token
        </button>
      </header>
    </div>
  );
}

export default App;
