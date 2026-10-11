import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
  return (
    <Layout>
      <SEO
        title="404 - Page Not Found"
        description="The page you are looking for doesn't exist or has been moved."
        path="/404"
      />
      <div className="notfound-wrapper">
        <div className="glass-card notfound-card">
          <div className="glass-card-subtle notfound-icon-container">
            <FileQuestion size={34} strokeWidth={1.75} />
          </div>

          <span className="notfound-badge">
            404 Error
          </span>
          <h1 className="notfound-title">
            Page not found
          </h1>
          <p className="notfound-description">
            Sorry, we couldn’t find the page you’re looking for. It may have been moved, deleted, or the URL might be incorrect.
          </p>

          <div className="notfound-actions">
            <Link
              to="/dashboard"
              className="glass-btn-primary notfound-btn"
            >
              <Home size={15} />
              <span>Go to Dashboard</span>
            </Link>
            <Link
              to="/transactions"
              className="glass-btn notfound-btn"
            >
              <ArrowLeft size={15} />
              <span>View Transactions</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
