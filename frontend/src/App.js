import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { 
  Search, Menu, X, Plus, MapPin, Calendar, 
  MessageCircle, User, LogOut, Upload, Star,
  Heart, Share2, Filter, Eye, ChevronRight
} from 'lucide-react';
import './App.css';
import SearchPage from './components/SearchPage';
import AddItemPage from './components/AddItemPage';

// Configuration
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Swiss cantons
const SWISS_CANTONS = [
  "Aargau", "Appenzell Innerrhoden", "Appenzell Ausserrhoden", "Bern",
  "Basel-Landschaft", "Basel-Stadt", "Fribourg", "Genève", "Glarus",
  "Graubünden", "Jura", "Luzern", "Neuchâtel", "Nidwalden", "Obwalden",
  "Schaffhausen", "Solothurn", "St. Gallen", "Thurgau", "Ticino",
  "Uri", "Vaud", "Valais", "Zug", "Zürich"
];

const CATEGORIES = [
  "Vélos", "Outils", "Électronique", "Sport", "Jardinage", 
  "Électroménager", "Livres", "Vêtements", "Mobilier", "Autre"
];

// Context for user authentication
const AuthContext = React.createContext();

// Hook to use auth context
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      
      toast.success('Connexion réussie !');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await fetchUserProfile();
      
      toast.success('Inscription réussie !');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur d\'inscription');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Déconnexion réussie');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Header Component
const Header = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-swiss-red rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ShareSwiss</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/search" className="text-gray-700 hover:text-swiss-red">
              Rechercher
            </Link>
            {user ? (
              <>
                <Link to="/add-item" className="text-gray-700 hover:text-swiss-red">
                  Ajouter un objet
                </Link>
                <Link to="/bookings" className="text-gray-700 hover:text-swiss-red">
                  Mes réservations
                </Link>
                <Link to="/messages" className="text-gray-700 hover:text-swiss-red">
                  Messages
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-swiss-red"
                >
                  <LogOut size={16} />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-swiss-red">
                  Connexion
                </Link>
                <Link to="/register" className="btn-primary">
                  Inscription
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-2">
              <Link to="/search" className="py-2 text-gray-700">Rechercher</Link>
              {user ? (
                <>
                  <Link to="/add-item" className="py-2 text-gray-700">Ajouter un objet</Link>
                  <Link to="/bookings" className="py-2 text-gray-700">Mes réservations</Link>
                  <Link to="/messages" className="py-2 text-gray-700">Messages</Link>
                  <button onClick={logout} className="py-2 text-left text-gray-700">
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="py-2 text-gray-700">Connexion</Link>
                  <Link to="/register" className="py-2 text-gray-700">Inscription</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

// Home Page Component
const HomePage = () => {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCanton, setSelectedCanton] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedItems();
  }, []);

  const fetchFeaturedItems = async () => {
    try {
      const response = await api.get('/api/items?limit=6');
      setFeaturedItems(response.data.items);
    } catch (error) {
      console.error('Erreur lors du chargement des objets:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedCanton) params.append('canton', selectedCanton);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient text-white py-20 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.pexels.com/photos/6869051/pexels-photo-6869051.jpeg" 
            alt="People sharing" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Partagez, Louez, Économisez
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            La plateforme de partage P2P de confiance en Suisse
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur rounded-lg p-2 search-bar flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Que recherchez-vous ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border-0 focus:outline-none text-gray-900"
                />
              </div>
              <div className="md:w-48">
                <select
                  value={selectedCanton}
                  onChange={(e) => setSelectedCanton(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border-0 focus:outline-none text-gray-900 canton-select"
                >
                  <option value="">Tous les cantons</option>
                  {SWISS_CANTONS.map(canton => (
                    <option key={canton} value={canton}>{canton}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary px-8 py-3">
                <Search size={20} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Catégories populaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {CATEGORIES.slice(0, 10).map((category, index) => (
              <Link
                key={category}
                to={`/search?categorie=${encodeURIComponent(category)}`}
                className="category-card card p-6 text-center hover:shadow-lg"
              >
                <div className="w-12 h-12 bg-swiss-red rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold">{category[0]}</span>
                </div>
                <h3 className="font-medium text-gray-900">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Objets en vedette</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/search" className="btn-primary px-8 py-3">
              Voir tous les objets
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-swiss-red rounded-full mx-auto mb-4 flex items-center justify-center">
                <Search className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Recherchez</h3>
              <p className="text-gray-600">Trouvez l'objet dont vous avez besoin près de chez vous</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-swiss-red rounded-full mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Contactez</h3>
              <p className="text-gray-600">Discutez avec le propriétaire et réservez l'objet</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-swiss-red rounded-full mx-auto mb-4 flex items-center justify-center">
                <Star className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Partagez</h3>
              <p className="text-gray-600">Profitez de l'objet et laissez un avis</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Item Card Component
const ItemCard = ({ item }) => {
  return (
    <div className="item-card card overflow-hidden">
      <div className="relative">
        {item.images && item.images.length > 0 ? (
          <img
            src={`${API_BASE_URL}${item.images[0]}`}
            alt={item.titre}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">Pas d'image</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white rounded-full p-1">
          <Heart size={16} className="text-gray-400" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{item.titre}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <MapPin size={14} className="mr-1" />
          <span>{item.ville}, {item.canton}</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-swiss-red font-bold text-lg">
              {item.prix_par_jour} CHF
            </span>
            <span className="text-gray-500 text-sm">/jour</span>
          </div>
          <Link
            to={`/item/${item.id}`}
            className="btn-primary text-sm px-3 py-1"
          >
            Voir détails
          </Link>
        </div>
      </div>
    </div>
  );
};

// Login Component
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    const success = await login(data.email, data.password);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="card p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Connexion</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email requis' })}
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                {...register('password', { required: 'Mot de passe requis' })}
                className="input-field"
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full">
              Se connecter
            </button>
          </form>
          <p className="text-center mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-swiss-red hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const RegisterPage = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    const success = await authRegister(data);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="card p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Inscription</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <input
                  {...register('prenom', { required: 'Prénom requis' })}
                  className="input-field"
                />
                {errors.prenom && (
                  <p className="text-red-600 text-sm mt-1">{errors.prenom.message}</p>
                )}
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  {...register('nom', { required: 'Nom requis' })}
                  className="input-field"
                />
                {errors.nom && (
                  <p className="text-red-600 text-sm mt-1">{errors.nom.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email requis' })}
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="label">Canton</label>
              <select
                {...register('canton', { required: 'Canton requis' })}
                className="input-field canton-select"
              >
                <option value="">Sélectionnez votre canton</option>
                {SWISS_CANTONS.map(canton => (
                  <option key={canton} value={canton}>{canton}</option>
                ))}
              </select>
              {errors.canton && (
                <p className="text-red-600 text-sm mt-1">{errors.canton.message}</p>
              )}
            </div>
            <div>
              <label className="label">Téléphone (optionnel)</label>
              <input
                type="tel"
                {...register('telephone')}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                {...register('password', { 
                  required: 'Mot de passe requis',
                  minLength: { value: 6, message: 'Minimum 6 caractères' }
                })}
                className="input-field"
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: 'Confirmation requise',
                  validate: value => value === password || 'Les mots de passe ne correspondent pas'
                })}
                className="input-field"
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full">
              S'inscrire
            </button>
          </form>
          <p className="text-center mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-swiss-red hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8 border-4 border-swiss-red border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/search" 
              element={
                <div className="min-h-screen py-8">
                  <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-3xl font-bold mb-8">Recherche d'objets</h1>
                    <p className="text-gray-600">Fonctionnalité de recherche en développement...</p>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/add-item" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen py-8">
                    <div className="max-w-2xl mx-auto px-4">
                      <h1 className="text-3xl font-bold mb-8">Ajouter un objet</h1>
                      <p className="text-gray-600">Formulaire d'ajout d'objet en développement...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/bookings" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen py-8">
                    <div className="max-w-4xl mx-auto px-4">
                      <h1 className="text-3xl font-bold mb-8">Mes réservations</h1>
                      <p className="text-gray-600">Gestion des réservations en développement...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen py-8">
                    <div className="max-w-4xl mx-auto px-4">
                      <h1 className="text-3xl font-bold mb-8">Messages</h1>
                      <p className="text-gray-600">Système de messagerie en développement...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;