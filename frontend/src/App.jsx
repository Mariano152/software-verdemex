import { BrowserRouter as Router, useRoutes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ConfirmDialogProvider } from './context/ConfirmDialogProvider';
import { routes } from './router/routes';
import './App.css';

function AppRoutes() {
  return useRoutes(routes);
}

function App() {
  return (
    <AuthProvider>
      <ConfirmDialogProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ConfirmDialogProvider>
    </AuthProvider>
  );
}

export default App;
