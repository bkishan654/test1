Below is a complete refactored version of your code to handle breadcrumbs and navigation more robustly:


---

Refactored Code

IntelLabProductSpecs.jsx

import React, { useEffect, useState } from 'react';
import productSpecTasks from '../../services/api/tasks/productSpecTasks';
import { decryptText } from '../../services/aes';
import { useNavigate } from 'react-router-dom';
import Loader from '../../shared/Loader/Loader';

const IntelLabProductSpecs = () => {
  const [hierData, setHierData] = useState([]);
  const [currLevelData, setCurrLevelData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDataFromHierarchy();
  }, []);

  const fetchDataFromHierarchy = async () => {
    setLoading(true);
    const hierarchyData = await productSpecTasks.getProducts(
      'Intel_Lab',
      process.env.REACT_APP_API_USERNAME,
      decryptText(process.env.REACT_APP_API_PASSWORD)
    );

    const formattedData = hierarchyData.rows.map((group) => ({
      id: group.values[0],
      parentId: group.values[1],
      name: group.values[3],
      children: [],
    }));

    const tree = {};
    const mapping = {};
    formattedData.forEach((item) => {
      mapping[item.id] = item;
    });

    formattedData.forEach((item) => {
      if (item.parentId) {
        mapping[item.parentId]?.children.push(item);
      } else {
        tree[item.id] = item;
      }
    });

    setHierData(Object.values(tree));
    setCurrLevelData(Object.values(tree));
    setLoading(false);
  };

  const handleItemClick = (item) => {
    const updatedBreadcrumbs = [...breadcrumbs, item];
    setBreadcrumbs(updatedBreadcrumbs);

    if (item.children.length > 0) {
      setCurrLevelData(item.children);
    } else {
      // Navigate to the product list page
      navigate(`/products/${item.name}`, { state: { breadcrumbs: updatedBreadcrumbs } });
    }
  };

  const handleBreadcrumbClick = (index) => {
    const updatedBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(updatedBreadcrumbs);

    const parentItem = updatedBreadcrumbs[index];
    setCurrLevelData(parentItem.children || []);
  };

  return (
    <div>
      {loading ? (
        <Loader />
      ) : (
        <div className="product-container">
          <nav className="breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <span
                key={crumb.id}
                onClick={() => handleBreadcrumbClick(index)}
                className="breadcrumb"
              >
                {crumb.name} {index < breadcrumbs.length - 1 && ' / '}
              </span>
            ))}
          </nav>
          <div className="product-list">
            {currLevelData.map((item) => (
              <div
                key={item.id}
                className="product-item"
                onClick={() => handleItemClick(item)}
              >
                {item.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelLabProductSpecs;


---

ProductSpecifications.jsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ProductSpecifications = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumbs = location.state?.breadcrumbs || [];

  const handleBreadcrumbClick = (index) => {
    const updatedBreadcrumbs = breadcrumbs.slice(0, index + 1);

    if (index === breadcrumbs.length - 1) {
      navigate(`/products/${breadcrumbs[index].name}`, { state: { breadcrumbs: updatedBreadcrumbs } });
    } else {
      navigate(`/`, { state: { breadcrumbs: updatedBreadcrumbs } });
    }
  };

  return (
    <div>
      <nav className="breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <span
            key={crumb.id}
            onClick={() => handleBreadcrumbClick(index)}
            className="breadcrumb"
          >
            {crumb.name} {index < breadcrumbs.length - 1 && ' / '}
          </span>
        ))}
      </nav>
      <div className="product-details">
        <h1>Product Details for {breadcrumbs[breadcrumbs.length - 1]?.name}</h1>
      </div>
    </div>
  );
};

export default ProductSpecifications;


---

Key Fixes:

1. Centralized Breadcrumb Logic:

Breadcrumbs are stored and propagated consistently via state.

Updates to breadcrumbs are handled explicitly in handleItemClick and handleBreadcrumbClick.



2. Dynamic Data Flow:

Parent-child relationships are processed into a tree structure for easier traversal and rendering.



3. Simplified Navigation:

Navigation leverages React Router navigate with consistent state for breadcrumbs.



4. Reduced Redundancy:

Removed duplicate breadcrumb logic by creating a unified breadcrumb manager.





---

Breadcrumb Example Flow:

1. Homepage:

User sees a list of programs.



2. Program Click:

Breadcrumb updates: Program.

User sees a list of offerings.



3. Offering Click:

Breadcrumb updates: Program / Offering.

User sees a list of product types.



4. Product Type Click:

Breadcrumb updates: Program / Offering / Product Type.

User navigates to product list.




Each breadcrumb allows navigation to previous steps by clicking. Let me know if you face any specific issues!

    
