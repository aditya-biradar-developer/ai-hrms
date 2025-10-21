import ManualQuestionEntry from './ManualQuestionEntry';

export default function CustomQuestionsModal({ isOpen, onClose, onSave, applicationId }) {
  return (
    <ManualQuestionEntry 
      isOpen={isOpen} 
      onClose={onClose} 
      onSave={onSave}
    />
  );
}
