
import { useState } from 'react';
import { Search, FileText, BookOpen } from 'lucide-react';
import './ClientPages.css';

const HelpCenter = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const articles = [
    { id: 1, title: 'Cómo agregar una cuenta bancaria', category: 'Cuentas', content: 'Para agregar una cuenta bancaria, ve a la sección Cuentas y haz clic en "Agregar cuenta".' },
    { id: 2, title: 'Cómo cambiar tu presupuesto', category: 'Presupuestos', content: 'Ve a Presupuestos, selecciona el que quieras modificar y edita los valores.' },
    { id: 3, title: 'Cómo usar las recomendaciones de IA', category: 'IA', content: 'Las recomendaciones de IA aparecen en la sección de Inicio, puedes aceptarlas o ignorarlas.' },
    { id: 4, title: 'Cómo exportar tus datos', category: 'Exportación', content: 'Ve a Configuración y selecciona la opción de Exportar datos.' }
  ];

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="help-center">
      <h2>Centro de Ayuda</h2>
      <div className="search-bar">
        <Search size={20} />
        <input 
          type="text" 
          placeholder="Buscar artículos..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="articles-grid">
        {filteredArticles.map(article => (
          <div key={article.id} className="article-card">
            <BookOpen size={24} />
            <div className="article-content">
              <span className="article-category">{article.category}</span>
              <h3>{article.title}</h3>
              <p>{article.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pdf-section">
        <FileText size={24} />
        <button className="pdf-btn">Descargar Manual en PDF</button>
      </div>
    </div>
  );
};

export default HelpCenter;
