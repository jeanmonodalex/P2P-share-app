import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, MapPin, Star, Calendar } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

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

const SearchPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCanton, setSelectedCanton] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const canton = params.get('canton') || '';
    const category = params.get('categorie') || '';
    
    setSearchQuery(q);
    setSelectedCanton(canton);
    setSelectedCategory(category);
    
    fetchItems({ q, canton, categorie: category });
  }, [location.search]);

  const fetchItems = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.canton) params.append('canton', filters.canton);
      if (filters.categorie) params.append('categorie', filters.categorie);
      if (filters.prix_max) params.append('prix_max', filters.prix_max);
      
      const response = await axios.get(`${API_BASE_URL}/api/items?${params.toString()}`);
      setItems(response.data.items);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedCanton) params.append('canton', selectedCanton);
    if (selectedCategory) params.append('categorie', selectedCategory);
    
    navigate(`/search?${params.toString()}`);
  };

  const handleFilterSubmit = () => {
    fetchItems({
      q: searchQuery,
      canton: selectedCanton,
      categorie: selectedCategory,
      prix_max: maxPrice
    });
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Que recherchez-vous ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-red focus:border-transparent"
                />
              </div>
              <div className="md:w-48">
                <select
                  value={selectedCanton}
                  onChange={(e) => setSelectedCanton(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-red focus:border-transparent"
                >
                  <option value="">Tous les cantons</option>
                  {SWISS_CANTONS.map(canton => (
                    <option key={canton} value={canton}>{canton}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary px-6 py-3">
                <Search size={20} />
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary px-6 py-3"
              >
                <Filter size={20} />
              </button>
            </div>
            
            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-swiss-red focus:border-transparent"
                    >
                      <option value="">Toutes les catégories</option>
                      {CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix maximum (CHF/jour)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 50"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-swiss-red focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('');
                      setMaxPrice('');
                      setShowFilters(false);
                    }}
                    className="btn-secondary"
                  >
                    Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={handleFilterSubmit}
                    className="btn-primary"
                  >
                    Appliquer les filtres
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {items.length} résultat{items.length !== 1 ? 's' : ''} trouvé{items.length !== 1 ? 's' : ''}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading-spinner w-8 h-8 border-4 border-swiss-red border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Search className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun résultat trouvé
            </h3>
            <p className="text-gray-600">
              Essayez de modifier vos critères de recherche ou explorez les catégories populaires.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ItemCard = ({ item }) => {
  const navigate = useNavigate();

  return (
    <div className="item-card card overflow-hidden cursor-pointer" onClick={() => navigate(`/item/${item.id}`)}>
      <div className="relative">
        {item.images && item.images.length > 0 ? (
          <img
            src={`${API_BASE_URL}${item.images[0]}`}
            alt={item.titre}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-swiss-red to-swiss-blue flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {item.titre.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium">
          {item.categorie}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{item.titre}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPin size={14} className="mr-1" />
          <span>{item.ville}, {item.canton}</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-swiss-red font-bold text-xl">
              {item.prix_par_jour} CHF
            </span>
            <span className="text-gray-500 text-sm">/jour</span>
          </div>
          <div className="flex items-center">
            <Star className="text-yellow-400 fill-current" size={16} />
            <span className="text-sm text-gray-600 ml-1">
              {item.note_moyenne > 0 ? item.note_moyenne.toFixed(1) : 'Nouveau'}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Par {item.proprietaire_nom}</span>
            <span className="text-swiss-red font-medium">+ {item.frais_inscription} CHF frais</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;