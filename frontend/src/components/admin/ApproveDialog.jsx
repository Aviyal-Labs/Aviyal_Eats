import ConfirmDialog from '../common/ConfirmDialog';
export default function ApproveDialog(props) { return <ConfirmDialog {...props} title="Approve restaurant?" description="This restaurant will move from pending review to approved." confirmLabel="Approve restaurant" />; }
