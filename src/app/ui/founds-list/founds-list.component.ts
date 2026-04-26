import { HeaderComponent } from "../../component/header/header.component";
import { FooterComponent } from "../../component/footer/footer.component";
import { Component, HostListener, Inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule, DOCUMENT } from "@angular/common";
import { Fundo } from "../../interfaces/fundos.interface";
import { FoundsService } from "../../Services/founds.service";
import { Route, Router } from "@angular/router";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-founds-list',
  templateUrl: './founds-list.component.html',
  styleUrls: ['./founds-list.component.css'],
  standalone: true,
  imports: [
    HeaderComponent,
    FooterComponent,
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ]
})
export class FoundsListComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['codigo', 'nome', 'cnpj', 'codigo_tipo', 'patrimonio', 'acoes'];
  dataSource: Fundo[] = [];
  filteredDataSource: Fundo[] = [];
  searchTerm: string = '';
  loading = false;
  showEditModal = false;
  editLoading = false;
  editingOriginalCode = '';
  editFormGroup: FormGroup;

  // Paginação
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private foundsService: FoundsService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    private formBuilder: FormBuilder
  ) {
    this.editFormGroup = this.formBuilder.group({
      codigo: ['', Validators.required],
      nome: ['', Validators.required],
      cnpj: ['', Validators.required],
      codigo_tipo: ['', Validators.required],
      patrimonio: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.carregarFundos();
  }

  ngOnDestroy(): void {
    this.enableBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showEditModal) {
      this.closeEditModal();
    }
  }

  carregarFundos() {
    // Dados mockados - substituir pela chamada da API
    this.foundsService.getFounds().subscribe({
      next: (fundo) => {
        if (this.foundsService.foundListServer) {
          this.dataSource = this.foundsService.foundListServer;
        } else {
          this.dataSource = fundo;
        }
        console.log('Lista trazido com sucesso:', this.dataSource);
        this.atualizarFiltro();
      },
      error: (erro) => console.error('Erro: erro ao trazer a lista', erro)
    });
  }

  atualizarFiltro() {
    if (!this.searchTerm) {
      this.filteredDataSource = [...this.dataSource];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDataSource = this.dataSource.filter(fundo =>
        fundo.codigo.toLowerCase().includes(term) ||
        fundo.nome.toLowerCase().includes(term) ||
        fundo.cnpj.includes(term) ||
        fundo.codigo_tipo.toLowerCase().includes(term)
      );
    }
  }

  onSearchChange() {
    const termo = this.searchTerm;

    if (!termo || termo.trim() === '') {
      // Se vazio, mostra todos
      this.filteredDataSource = [...this.dataSource];
    } else {
      // Filtra a lista
      const term = termo.toLowerCase();
      this.filteredDataSource = this.dataSource.filter(fundo =>
        fundo.codigo.toLowerCase().includes(term) ||
        fundo.nome.toLowerCase().includes(term) ||
        fundo.cnpj.includes(term) ||
        fundo.codigo_tipo.toString().toLowerCase().includes(term)
      );
    }
  }

  // Paginação
  get paginatedData(): Fundo[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredDataSource.slice(start, end);
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  get totalRecords(): number {
    return this.filteredDataSource.length;
  }

  // Ações
  RedirectByForm() { // redirecionar pra tela nova
    this.snackBar.open('Abrindo formulário para adicionar fundo...', 'Fechar', { duration: 2000 });
    this.router.navigate(['forms-new-founds']);
  }

  filterFoundByCode(code: string) {
    console.log('🔍 Buscando código:', code);

    this.foundsService.getFoundsByCode(code).subscribe({
      next: (fundo) => {
        console.log(' Fundo encontrado:', fundo);
        this.dataSource = [fundo];
      },
      error: (erro) => {
        console.error('Erro:', erro.status, erro.statusText);
        if (erro.status === 404) {
          this.snackBar.open(`Fundo ${code} não encontrado`, 'Fechar');
        }
      }
    });
  }

  deleteFound(fundo: Fundo) {  // ver com o vini
    const confirmacao = confirm(`Tem certeza que deseja excluir o fundo ${fundo.nome}?`);
    if (confirmacao) {
      this.dataSource = this.dataSource.filter(f => f.id !== fundo.id);
      this.atualizarFiltro();
      this.snackBar.open(`Fundo ${fundo.nome} excluído com sucesso!`, 'Fechar', { duration: 3000 });
    }
  }

  editHeritage(founds: Fundo, code: string, heritage: number) { // ver com o vini
    this.foundsService.PutHeritageByCode(founds, code, heritage).subscribe({
      next: (valor) => {
        console.log(valor);
        this.snackBar.open('Fundo atualizado com sucesso!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/founds-list']);
        this.loading = false;
        this.formatHeritage(heritage);
      },
      error: (error) => {
        this.snackBar.open(error.error?.error || 'Erro ao atualizar', 'Fechar', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  formatHeritage(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  editFound(fundo: Fundo) {
    this.editingOriginalCode = fundo.codigo;
    this.editFormGroup.patchValue({
      codigo: fundo.codigo,
      nome: fundo.nome,
      cnpj: fundo.cnpj,
      codigo_tipo: fundo.codigo_tipo,
      patrimonio: Number(fundo.patrimonio)
    });
    this.showEditModal = true;
    this.disableBodyScroll();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editLoading = false;
    this.enableBodyScroll();
  }

  private disableBodyScroll(): void {
    this.document.body.style.overflow = 'hidden';
  }

  private enableBodyScroll(): void {
    this.document.body.style.overflow = 'auto';
  }

  saveEditFundo(): void {
    if (this.editFormGroup.invalid) {
      this.snackBar.open('Preencha todos os campos obrigatórios', 'Fechar', { duration: 3000 });
      return;
    }

    const formValue = this.editFormGroup.getRawValue();
    const foundToEdit = this.dataSource.find((fundo) => fundo.codigo === this.editingOriginalCode);
    const payload: Fundo = {
      id: foundToEdit?.id || '',
      codigo: formValue.codigo.trim(),
      nome: formValue.nome.trim(),
      cnpj: formValue.cnpj.trim(),
      codigo_tipo: String(formValue.codigo_tipo).trim(),
      patrimonio: Number(formValue.patrimonio)
    };

    this.editLoading = true;

    this.dataSource = this.dataSource.map((fundo) =>
      fundo.codigo === this.editingOriginalCode ? payload : fundo
    );

    this.foundsService.foundListServer = this.dataSource.map((fundo) =>
      fundo.codigo === this.editingOriginalCode ? payload : fundo
    );
    this.atualizarFiltro();

    this.snackBar.open('Fundo atualizado com sucesso!', 'Fechar', { duration: 3000 });
    this.closeEditModal();
  }
}