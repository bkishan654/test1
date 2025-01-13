import React, { useEffect, useState } from 'react';
import productSpecTasks from '../../services/api/tasks/productSpecTasks';
import { decryptText } from '../../services/aes';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../../shared/Loader/Loader';
import { isEmpty } from 'lodash';

const IntelLabProductSpecs = () => {
  const [hierData, setHierData] = useState(null);
  const [currLevelData, setCurrLevelData] = useState([]);
  const [currLevelIndex, setCurrLevelIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedProgramName, setSelectedProgramName] = useState('');
  const [parentId, setParentId] = useState('');
  const [stateData, setStateData] = useState([]);
  const [navigateData, setNavigateData] = useState(null);

  const location = useLocation();
  const state = location.state?.data || [];
  const navigate = useNavigate();

  useEffect(() => {
    setStateData(state);
    fetchHierarchyData();
  }, []);

  const fetchHierarchyData = async () => {
    setLoading(true);
    const hierarchyData = await productSpecTasks.getProducts(
      'Intel_Lab',
      process.env.REACT_APP_API_USERNAME,
      decryptText(process.env.REACT_APP_API_PASSWORD)
    );

    const hierarchyTree = buildHierarchyTree(hierarchyData.rows);
    enrichWithLevels(hierarchyTree, 0);

    setHierData(hierarchyTree);
    setCurrLevelData(hierarchyTree?.children || []);
    setLoading(false);
  };

  const buildHierarchyTree = (hierarchyRows) => {
    const nodesById = {};
    let root = null;

    hierarchyRows.forEach((row) => {
      const node = {
        id: row.values[0],
        parentId: row.values[1],
        name: row.values[3],
        children: [],
      };
      nodesById[node.id] = node;

      if (!node.parentId) root = node;
    });

    hierarchyRows.forEach((row) => {
      const parentId = row.values[1];
      if (parentId && nodesById[parentId]) {
        nodesById[parentId].children.push(nodesById[row.values[0]]);
      }
    });

    return root;
  };

  const enrichWithLevels = (node, level) => {
    if (!node) return;
    node.level = level;

    node.children.forEach((child) => {
      enrichWithLevels(child, level + 1);
    });
  };

  const handleChildSelection = (node) => {
    const newStateData = [...stateData, [node.name, node.id, node.level]];

    if (node.children?.length) {
      setCurrLevelIndex(node.level);
      setCurrLevelData(node.children);
      setParentId(node.id);
    } else {
      navigate(`/products/${node.id}`, {
        state: {
          data: newStateData,
          parentName: selectedProgramName,
          currLevelData: node,
        },
      });
    }

    if (node.level === 1) setSelectedProgramName(node.name);
    setStateData(newStateData);
  };

  const handleBackNavigation = () => {
    if (currLevelIndex <= 0) return;

    const parent = findParent(hierData, parentId);
    setCurrLevelIndex(currLevelIndex - 1);
    setCurrLevelData(parent?.children || []);
    setParentId(parent?.parentId || '');
  };

  const findParent = (node, id) => {
    if (!node || !id) return null;

    if (node.children.some((child) => child.id === id)) {
      return node;
    }

    for (const child of node.children) {
      const parent = findParent(child, id);
      if (parent) return parent;
    }

    return null;
  };

  const renderTitle = () => {
    switch (currLevelIndex) {
      case 0:
        return <h3>Select your Program</h3>;
      case 1:
        return <h3>Select your Offering</h3>;
      default:
        return <h3>Select your Product</h3>;
    }
  };

  return (
    <div>
      {loading ? (
        <Loader />
      ) : (
        <div className="product-container">
          <div className="product-browse">
            <span className="product-header">
              {currLevelIndex > 0 && (
                <i
                  className="fa-solid fa-circle-arrow-left"
                  onClick={handleBackNavigation}
                ></i>
              )}
              {renderTitle()}
            </span>
            <div className="product-categories">
              {currLevelData.map((data) => (
                <div
                  className="product-category"
                  onClick={() => handleChildSelection(data)}
                  key={data.id}
                >
                  {data.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelLabProductSpecs;
