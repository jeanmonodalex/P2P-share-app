import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, X, Plus, Camera } from 'lucide-react';

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

const AddItemPage = () => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const prixParJour = watch('prix_par_jour', 0);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages(prev => [...prev, {
            file,
            preview: e.target.result,
            id: Date.now() + Math.random()
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const onSubmit = async (data) => {
    if (images.length === 0) {
      toast.error('Veuillez ajouter au moins une image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('titre', data.titre);
      formData.append('description', data.description);
      formData.append('categorie', data.categorie);
      formData.append('prix_par_jour', data.prix_par_jour);
      formData.append('canton', data.canton);
      formData.append('ville', data.ville);
      
      // Add images
      images.forEach(image => {
        formData.append('files', image.file);
      });

      await axios.post(`${API_BASE_URL}/api/items`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Objet ajouté avec succès !');
      navigate('/search');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Ajouter un objet à partager
          </h1>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Informations de base
              </h2>
              
              <div>
                <label className="label">Titre de l'annonce</label>
                <input
                  {...register('titre', { required: 'Titre requis' })}
                  className="input-field"
                  placeholder="Ex: Vélo électrique en excellent état"
                />
                {errors.titre && (
                  <p className="text-red-600 text-sm mt-1">{errors.titre.message}</p>
                )}
              </div>

              <div>
                <label className="label">Description détaillée</label>
                <textarea
                  {...register('description', { required: 'Description requise' })}
                  rows={4}
                  className="input-field"
                  placeholder="Décrivez votre objet en détail : état, utilisation, accessoires inclus..."
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="label">Catégorie</label>
                <select
                  {...register('categorie', { required: 'Catégorie requise' })}
                  className="input-field"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.categorie && (
                  <p className="text-red-600 text-sm mt-1">{errors.categorie.message}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Localisation</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Canton</label>
                  <select
                    {...register('canton', { required: 'Canton requis' })}
                    className="input-field"
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
                  <label className="label">Ville</label>
                  <input
                    {...register('ville', { required: 'Ville requise' })}
                    className="input-field"
                    placeholder="Ex: Lausanne"
                  />
                  {errors.ville && (
                    <p className="text-red-600 text-sm mt-1">{errors.ville.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Tarification</h2>
              
              <div>
                <label className="label">Prix par jour (CHF)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('prix_par_jour', { 
                    required: 'Prix requis',
                    min: { value: 0.01, message: 'Le prix doit être supérieur à 0' }
                  })}
                  className="input-field"
                  placeholder="Ex: 25.00"
                />
                {errors.prix_par_jour && (
                  <p className="text-red-600 text-sm mt-1">{errors.prix_par_jour.message}</p>
                )}
                
                {prixParJour > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Récapitulatif des coûts pour le locataire :</strong><br />
                      Prix par jour : {prixParJour} CHF<br />
                      Frais d'inscription : 5.00 CHF<br />
                      <strong>Total pour 1 jour : {(parseFloat(prixParJour) + 5).toFixed(2)} CHF</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {images.map((image) => (
                  <div key={image.id} className="relative">
                    <img
                      src={image.preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-swiss-red hover:bg-red-50 transition-colors">
                    <Camera className="text-gray-400 mb-2" size={24} />
                    <span className="text-sm text-gray-500">Ajouter une photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                Ajoutez jusqu'à 5 photos de votre objet. La première photo sera utilisée comme image principale.
              </p>
            </div>

            {/* Terms */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Conditions importantes :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Des frais d'inscription de 5 CHF sont automatiquement ajoutés</li>
                <li>• Vous êtes responsable de l'état et de la sécurité de votre objet</li>
                <li>• Vérifiez l'identité des locataires avant la remise</li>
                <li>• ShareSwiss se réserve le droit de retirer les annonces inappropriées</li>
              </ul>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Publication...</span>
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    <span>Publier l'annonce</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemPage;