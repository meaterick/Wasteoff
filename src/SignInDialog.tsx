import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, Wallet, X } from 'lucide-react';
import { openingBudget, won } from './model';
import { signIn, type SignIn } from './participants';

export function SignInDialog({ create, onClose, onSignIn }: {
  create: boolean;
  onClose: () => void;
  onSignIn: (account: SignIn) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [registration, setRegistration] = useState(create);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      onSignIn(await signIn(String(form.get('participant')), String(form.get('password')), registration));
    } catch (reason) {
      setError(reason instanceof DOMException
        ? '브라우저에서 참가자 기록에 접근할 수 없어요. 사이트 저장이 허용되어 있는지 확인해 주세요.'
        : reason instanceof Error ? reason.message : '로그인에 실패했어요. 다시 시도해 주세요.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-title"
      onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
      onClick={event => { if (!saving && event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-inner auth-inner">
        <button type="button" className="icon-button dialog-close" aria-label="로그인 창 닫기" onClick={onClose} disabled={saving}>
          <X size={20} aria-hidden="true" />
        </button>
        <span className="auth-icon"><KeyRound size={22} aria-hidden="true" /></span>
        <h2 id="auth-title">{registration ? '참가자 계정 만들기' : '참가자 로그인'}</h2>
        <p className="auth-budget"><Wallet size={17} aria-hidden="true" /> 시작 예산 <strong>{won(openingBudget)}</strong></p>
        <form onSubmit={submit}>
          <label>참가자 이름<input name="participant" autoComplete="username" required minLength={2} maxLength={20} readOnly={saving} /></label>
          <label>비밀번호<input key={String(registration)} name="password" type="password"
            minLength={8} maxLength={128} required autoComplete={registration ? 'new-password' : 'current-password'}
            readOnly={saving} placeholder={registration ? '8자 이상' : undefined} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" type="submit" disabled={saving}>
            {saving ? '처리 중…' : registration ? '계정 만들고 입장' : '로그인하고 입장'} <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
        <p className="auth-switch">
          {registration ? '이미 참가자 계정이 있나요?' : '처음 참여하시나요?'}
          <button className="text-button" type="button" disabled={saving}
            onClick={() => { setError(''); setRegistration(!registration); }}>{registration ? '로그인' : '계정 만들기'}</button>
        </p>
        <p className="auth-foot">계정과 구매 기록은 이 브라우저에 저장돼요.</p>
      </div>
    </dialog>
  );
}
