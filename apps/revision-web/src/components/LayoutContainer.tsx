import React from "react";
import "../styles/LayoutContainer.css";

interface LayoutContainerProps {
    children: React.ReactNode;
}

const LayoutContainer: React.FC<LayoutContainerProps> = ({ children }) => {
    return (
        <div className="layout-container">
            {children}
        </div>
    );
};

export default LayoutContainer;
