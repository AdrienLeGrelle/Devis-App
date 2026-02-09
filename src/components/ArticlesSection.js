import React from 'react';
import './ArticlesSection.css';

function ArticlesSection({ articles, onChange }) {
  const addArticle = () => {
    const newArticle = {
      id: Date.now(),
      description: '',
      quantite: 1,
      prixUnitaire: 0,
      tva: 20
    };
    onChange([...articles, newArticle]);
  };

  const removeArticle = (id) => {
    if (articles.length > 1) {
      onChange(articles.filter(article => article.id !== id));
    }
  };

  const updateArticle = (id, field, value) => {
    const updatedArticles = articles.map(article => {
      if (article.id === id) {
        return { ...article, [field]: field === 'quantite' || field === 'prixUnitaire' || field === 'tva' 
          ? parseFloat(value) || 0 
          : value };
      }
      return article;
    });
    onChange(updatedArticles);
  };

  const calculateTotalHT = () => {
    return articles.reduce((sum, article) => {
      return sum + (article.quantite * article.prixUnitaire);
    }, 0);
  };

  const calculateTotalTTC = () => {
    return articles.reduce((sum, article) => {
      const ht = article.quantite * article.prixUnitaire;
      const ttc = ht * (1 + article.tva / 100);
      return sum + ttc;
    }, 0);
  };

  return (
    <div className="articles-section">
      <div className="articles-list">
        {articles.map((article, index) => (
          <div key={article.id} className="article-item">
            <div className="article-header">
              <span className="article-number">Article {index + 1}</span>
              {articles.length > 1 && (
                <button 
                  className="btn-remove"
                  onClick={() => removeArticle(article.id)}
                  type="button"
                >
                  ✕ Supprimer
                </button>
              )}
            </div>
            <div className="article-fields">
              <div className="form-group full-width">
                <label>Description *</label>
                <input
                  type="text"
                  value={article.description}
                  onChange={(e) => updateArticle(article.id, 'description', e.target.value)}
                  placeholder="Description de l'article"
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantité *</label>
                <input
                  type="number"
                  value={article.quantite}
                  onChange={(e) => updateArticle(article.id, 'quantite', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Prix unitaire HT (€) *</label>
                <input
                  type="number"
                  value={article.prixUnitaire}
                  onChange={(e) => updateArticle(article.id, 'prixUnitaire', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>TVA (%) *</label>
                <select
                  value={article.tva}
                  onChange={(e) => updateArticle(article.id, 'tva', e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5.5">5.5%</option>
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                </select>
              </div>
            </div>
            <div className="article-total">
              <strong>
                Total HT : {(article.quantite * article.prixUnitaire).toFixed(2)} € | 
                Total TTC : {((article.quantite * article.prixUnitaire) * (1 + article.tva / 100)).toFixed(2)} €
              </strong>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-add" onClick={addArticle} type="button">
        + Ajouter un article
      </button>

      <div className="totals-summary">
        <div className="total-line">
          <span>Total HT :</span>
          <strong>{calculateTotalHT().toFixed(2)} €</strong>
        </div>
        <div className="total-line">
          <span>TVA :</span>
          <strong>{(calculateTotalTTC() - calculateTotalHT()).toFixed(2)} €</strong>
        </div>
        <div className="total-line total-final">
          <span>Total TTC :</span>
          <strong>{calculateTotalTTC().toFixed(2)} €</strong>
        </div>
      </div>
    </div>
  );
}

export default ArticlesSection;


