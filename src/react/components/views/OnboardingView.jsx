import React from 'react';

const OnboardingView = ({ onComplete, onClose }) => {
    const handleComplete = () => {
        localStorage.setItem('onboardingCompleted', 'true');
        onComplete();
    };

    return (
        <div className="onboarding-view">
            <h2>Welcome to Cheating Daddy</h2>
            <p>This view will contain onboarding instructions.</p>
            <button onClick={handleComplete} className="button">
                Complete Onboarding
            </button>
            {/* TODO: Implement full onboarding interface */}
        </div>
    );
};

export default OnboardingView;