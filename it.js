import React, { useEffect, useState } from "react";
import productSpecTasks from "../../services/api/tasks/productSpecTasks";
import { decryptText } from "../../services/aes";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "../../shared/Loader/Loader";
import { isEmpty } from "lodash";

// Utility function to remove duplicates from the breadcrumb array
const removeDuplicate = (arr) =>
  arr.reduce((result, current) => {
    const index = result.findIndex((item) => item[0] === current[0]);
    if (index === -1) {
      result.push(current);
    }
    return result;
  }, []);

const IntelLabProductSpecs = () => {
  const [hierData, setHierData] = useState([]);
  const [currLevelData, setCurrLevelData] = useState([]);
  const [currLevelIndex, setCurrLevelIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stateData, setStateData] = useState([]);
  const [navigateData, setNavigateData] = useState(null);

  const location = useLocation();
  const state = location.state?.data || [];
  const navigate = useNavigate();

  let hierarchyMappingObject = {};

  const getHierarchyTree = (hierarchyData) => {
    let hierarchyTree = {};
    const mapping = {};
    const formattedHierarchyData = hierarchyData.map((group) => ({
      id: group.values[0],
      parentId: group.values[1],
      name: group.values[3],
      children: [],
      objectId: group.object.id,
    }));

    formattedHierarchyData.forEach((group) => {
      mapping[group.id] = group;
    });

    formattedHierarchyData.forEach((group) => {
      if (group.parentId) {
        mapping[group.parentId]?.children.push(mapping[group.id]);
      } else {
        hierarchyTree = mapping[group.id];
      }
    });

    hierarchyMappingObject = mapping;
    return hierarchyTree;
  };

  useEffect(() => {
    fetchDataFromHierarchy();
  }, []);

  const fetchDataFromHierarchy = async () => {
    setLoading(true);
    const hierarchyData = await productSpecTasks.getProducts(
      "Intel_Lab",
      process.env.REACT_APP_API_USERNAME,
      decryptText(process.env.REACT_APP_API_PASSWORD)
    );
    const hierarchyTree = getHierarchyTree(hierarchyData.rows);
    addLevels(hierarchyTree, 0);

    setHierData(hierarchyTree);
    setCurrLevelData(hierarchyTree.children);
    setLoading(false);
  };

  const addLevels = (node, level) => {
    if (!node) return;
    node.level = level;
    node.children?.forEach((child) => addLevels(child, level + 1));
  };

  useEffect(() => {
    if (!isEmpty(state) && hierData) {
      const breadcrumbs = removeDuplicate(state);
      setStateData(breadcrumbs);

      const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
      const parentNode = findNodeById(hierData, lastBreadcrumb[1]);

      if (parentNode) {
        setCurrLevelIndex(lastBreadcrumb[2]);
        setCurrLevelData(parentNode.children);
      }
    }
  }, [state, hierData]);

  const findNodeById = (node, id) => {
    if (!node) return null;
    if (node.id === id) return node;
    for (let child of node.children || []) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  const childDataHandler = (data) => {
    const newCrumb = [data.name, data.id, data.level];
    setStateData((prev) => removeDuplicate([...prev, newCrumb]));

    if (data.level < 2) {
      setCurrLevelData(data.children);
      setCurrLevelIndex(data.level);
    } else {
      const navigateData = {
        id: data.id,
        dataToSend: { ...data, parentName: stateData[0]?.[0] },
      };
      setNavigateData(navigateData);
    }
  };

  useEffect(() => {
    if (navigateData) {
      navigate(`/products/${navigateData.id}`, {
        state: { data: stateData, current: navigateData.dataToSend },
      });
    }
  }, [navigateData, navigate, stateData]);

  const renderTitle = () => {
    const titles = ["Select your Program", "Select your Offering", "Select your Product"];
    return <h3>{titles[currLevelIndex] || "Select an Item"}</h3>;
  };

  const backHandler = () => {
    if (currLevelIndex > 0) {
      setCurrLevelIndex((prev) => prev - 1);
      const previousCrumb = stateData[stateData.length - 2];
      const parentNode = findNodeById(hierData, previousCrumb?.[1]);
      setCurrLevelData(parentNode?.children || []);
      setStateData((prev) => prev.slice(0, -1));
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
                  onClick={backHandler}
                ></i>
              )}
              {renderTitle()}
            </span>
            <div className="product-categories">
              {currLevelData.map((data) => (
                <div
                  key={data.id}
                  className="product-category"
                  onClick={() => childDataHandler(data)}
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

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BreadCrumbs from "../../../utils/breadCrumbs";
import CommonSearch from "../../components/CommonSearch/CommonSearch";
import Compare from "../../components/Compare";

const ProductSpecifications = () => {
  const location = useLocation();
  const state = location.state || { data: [] };
  const navigate = useNavigate();

  const handleBreadcrumbClick = (crumbs, index) => {
    const newCrumbs = crumbs.slice(0, index + 1);
    navigate("/", { state: { data: newCrumbs } });
  };

  return (
    <>
      <BreadCrumbs
        crumbs={state.data}
        onClick={(crumbs, index) => handleBreadcrumbClick(crumbs, index)}
      />
      <div className="search-container">
        <Compare />
        <CommonSearch />
      </div>
      {/* Other component rendering logic */}
    </>
  );
};

export default ProductSpecifications;
