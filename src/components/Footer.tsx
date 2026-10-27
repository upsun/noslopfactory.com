import { ShopLink } from './shop/ShopLink';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <span className="eyebrow">LESS SLOP. MORE THOUGHT.</span>
          <div>
            <a href="/">The project ↗</a>
            <ShopLink href="/shop">The shop ↗</ShopLink>
          </div>
        </div>
        <a className="footer-wordmark" href="/">
          noslopfactory<span>.*</span>
        </a>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} noslopfactory</span>
          <span>A demo shop. Nothing for sale. Plenty to question.</span>
          <span className="mono">HUMAN IN THE LOOP ↗</span>
        </div>
      </div>
    </footer>
  );
}
