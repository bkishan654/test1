import React, { useEffect, useState } from 'react';
import productSpecTasks from '../../services/api/tasks/productSpecTasks';
import { decryptText } from '../../services/aes';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../../shared/Loader/Loader';
import { isEmpty } from 'lodash';

let crumbArray;

const removeDuplicate = (arr) => {
  return arr.reduce((result, current) => {
    const index = result.findIndex((item) => item[0] === current[0]);
    if (index === -1) {
      result.push(current);
    }
    return result;
  }, []);
};

const IntelLabProductSpecs = () => {
  const [hierData, setHierData] = useState([]);
  const [currLevelData, setCurrLevelData] = useState([]);
  const [currLevelIndex, setCurrLevelIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedProgramName, setSelectedProgramName] = useState('');
  const [parentId, setParentId] = useState('');
  const [stateData, setStateData] = useState([]);
  const [navigateData, setNavigateData] = useState(null);
  const [childrenData, setChildrenData] = useState([]);

  const [heading, setHeading] = useState('Select your product');

  const prop = useLocation();
  const state = prop.state?.data;

  const navigate = useNavigate();

  let hierarchyMappingObject = {};
  const getHierarchyTree = (hierarchyData) => {
    let hierarchyTree = {};
    const currHierarchyMappingObject = { ...hierarchyMappingObject };
    let formattedHierarchyData = hierarchyData?.map((group) => {
      const formattedGroup = {
        id: group.values[0],
        parentId: group.values[1],
        name: group.values[3],
        children: [],
        objectId: group.object.id,
      };
      currHierarchyMappingObject[group.values[0]] = formattedGroup;
      return formattedGroup;
    });

    formattedHierarchyData?.forEach((group) => {
      if (group.parentId)
        currHierarchyMappingObject[group.parentId]?.children.push(
          currHierarchyMappingObject[group.id]
        );
      else hierarchyTree = currHierarchyMappingObject[group.id];
    });

    hierarchyMappingObject = currHierarchyMappingObject;

    return hierarchyTree;
  };
  useEffect(()=>{

    let temp=state;
    // setStateData(temp)

  },[state]);

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
    const hierarchyTree = getHierarchyTree(hierarchyData.rows);
    function addLevels(node, level) {
      if (!node) return;
      node.level = level;
      if (node.children) {
        node.children.forEach((child) => {
          addLevels(child, level + 1);
        });
      }
    }
    addLevels(hierarchyTree, 0);
    setHierData(hierarchyTree);
    setCurrLevelData(hierarchyTree['children']);
    setLoading(false);
  };

  useEffect(() => {
    if (!isEmpty(state) && hierData) {
      crumbArray = [];
      state.forEach((value, index) => {
        if (index < state.length) {
          crumbArray.push(value);
        }
      });

      if (state.length === 1) {
        hierData.children?.forEach((data) => {
          if (data.name === state[0][0]) {
            setCurrLevelIndex(1);
            setChildrenData(data.children);
            setCurrLevelData(data.children);
            setParentId(data.parentId);
            setSelectedProgramName(data.name);
            setStateData([state[0]]);
          }
        });
      } else if (state.length === 2) {
        hierData.children?.forEach((data) => {
          if (data.name === state[0][0]) {
            data.children.map((element) => {
              if (element.id === state[1][1]) {
                setCurrLevelIndex(2);
                setChildrenData(element.children);
                setCurrLevelData(element.children);
                setParentId(element.parentId);
                setSelectedProgramName(state[0][0]);
                setStateData([state[0], state[1]]);
              }
            });
          }
        });
      }
    }
  }, [state, hierData]);

  useEffect(() => {
    if (navigateData) {
      let temp = stateData;
      temp = removeDuplicate(temp);
      setStateData(temp);
      console.log("final ", temp);

      navigate(`/products/${navigateData.id}`, {
        state: [navigateData.dataToSend, navigateData.currLevelData, stateData],
      });
    }
  }, [stateData, navigateData, navigate]);

  const childDataHandler = (data, e = null) => {
    let obj = [];
    obj.push(data?.name);
    obj.push(data?.id);
    obj.push(data?.level);
    if (data.level === 1) {
      setSelectedProgramName(data.name);
    }
    if (data.level === 1 || data.level === 2) {
      setCurrLevelData(data.children);
      setCurrLevelIndex(data.level);
      setParentId(data.id);
      addElement(obj);
    } else {
      addElement(obj);
      let dataToSend = { ...data };
      dataToSend.parentName = selectedProgramName;
      setNavigateData({ id: data.id, dataToSend, currLevelData });
    }
  };

  const addElement = (newElement) => {
    const updatedStateData = [...stateData, newElement];
    setStateData(updatedStateData);
  };

  const extractParentOfChildren = (node, result = []) => {
    if (node.children) {
      node.children.forEach((child) => {
        if (child.id === parentId) {
          setParentId(child.parentId);
          result.push(node.children);
        }
        extractParentOfChildren(child, result);
      });
    }
    return result.flat();
  };

  const backHandler = () => {
    setCurrLevelIndex(currLevelIndex - 1);
    const childrenAtLevel = extractParentOfChildren(hierData);
    setCurrLevelData(childrenAtLevel);
  };

  const renderTitle = () => {
    if (currLevelIndex === 0) {
      return <h3>Select your Program</h3>;
    } else if (currLevelIndex === 1) {
      return <h3>Select your Offering</h3>;
    } else {
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
              {currLevelIndex === 1 || currLevelIndex === 2 ? (
                <i
                  className="fa-solid fa-circle-arrow-left"
                  onClick={() => backHandler()}
                ></i>
              ) : null}
              {renderTitle()}
            </span>
            <div className="product-categories">
              {currLevelData.map((data) => (
                <div
                  className="product-category"
                  onClick={(e) => childDataHandler(data, e)}
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


import { useLocation, useNavigate } from "react-router-dom";
import EditProductSpecifications from "./EditProductSpecifications";
import NewProductSpecifications from "./NewProductSpecifications";
import CommonSearch from "../../components/CommonSearch/CommonSearch";
import Compare from "../../components/Compare";
import React, { useState } from "react";
import BreadCrumbs from "../../../utils/breadCrumbs";

const removeDuplicate = (arr) => {
  return arr.reduce((result, current) => {
    const index = result.findIndex((item) => item[0] === current[0]);
    if (index === -1) {
      result.push(current);
    }
    return result;
  }, []);
};

const ProductSpecifications = () => {
  const [event, setEvent] = useState();
  let paramSelector = new URLSearchParams(window.location.search);
  let productID = paramSelector.get('product_id');
  const location = useLocation();
  const state = location.state;
  localStorage.setItem('breadcrumbs', state.data);

  const navigate = useNavigate();

  const selected = (parent, crumb, e, index) => {
    let log = [];
    parent.forEach((element, key) => {
      if (key > index) {
        return;
      } else {
        log.push(element);
      }
    });

    if (log.length === 3) {
      window.history.back();
    }
    console.log("state sent ",log)

    navigate(`/`, { state: log, event: event, level: log.length });
  };

  const breadCrumbs = location?.state?.data?.length > 0
    ? removeDuplicate(location?.state?.data)
    : [['', 0]];

  localStorage.removeItem('breadCrumb');

  const [compareList, setCompareList] = useState(() => {
    const saved = window.localStorage.getItem('compareList');
    return saved ? JSON.parse(saved) : [];
  });

  return (
    <>
      <BreadCrumbs crumbs={breadCrumbs} selected={selected}></BreadCrumbs>
      <div className="search-container">
        <Compare compareList={compareList} setCompareList={setCompareList} />
        <CommonSearch />
      </div>
      {productID ? (
        <EditProductSpecifications
          productID={productID}
          product={state?.productType}
          parentName={state?.parentName}
        />
      ) : (
        <NewProductSpecifications
          product={state?.productType}
          productTypeID={state?.productId}
          parentName={state?.parentName}
        />
      )}
    </>
  );
}

export default ProductSpecifications;
