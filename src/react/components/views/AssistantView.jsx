import React from 'react';

const AssistantView = ({
    responses,
    currentResponseIndex,
    selectedProfile,
    onSendText,
    shouldAnimateResponse,
    onResponseIndexChanged,
    onResponseAnimationComplete
}) => {
    return (
        <div className="assistant-view">
            <h2>AI Assistant</h2>
            <p>This view will contain the AI assistant interface.</p>
            <p>Profile: {selectedProfile}</p>
            <p>Responses: {responses.length}</p>
            {/* TODO: Implement full assistant interface */}
        </div>
    );
};

export default AssistantView;