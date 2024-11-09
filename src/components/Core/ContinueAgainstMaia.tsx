interface Props {
  launchContinue: () => void
}
export const ContinueAgainstMaia: React.FC<Props> = ({ launchContinue }) => {
  return (
    <button
      onClick={launchContinue}
      className="flex w-full items-center gap-1.5 rounded bg-human-4 px-3 py-2 transition duration-200 hover:bg-human-3"
    >
      <span className="material-symbols-outlined text-base">swords</span>
      <span>Play position against Maia</span>
    </button>
  )
}
